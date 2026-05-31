using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class UserManagementService : IUserManagementService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public UserManagementService(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
    {
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public async Task<PagedResult<UserListDto>> GetUsersAsync(int page, int pageSize, string? search, string? role)
    {
        var query = _userManager.Users.AsQueryable();

        // Filter by role if specified
        if (!string.IsNullOrWhiteSpace(role))
        {
            var usersInRole = await _userManager.GetUsersInRoleAsync(role);
            var userIds = usersInRole.Select(u => u.Id).ToHashSet();
            query = query.Where(u => userIds.Contains(u.Id));
        }

        // Search by name or email
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(searchLower) ||
                u.Email!.ToLower().Contains(searchLower) ||
                (u.FullNameAr != null && u.FullNameAr.ToLower().Contains(searchLower)));
        }

        var totalCount = await query.CountAsync();
        var users = await query
            .OrderBy(u => u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<UserListDto>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            items.Add(new UserListDto(
                user.Id,
                user.Email!,
                user.FullName,
                user.FullNameAr,
                roles.FirstOrDefault() ?? "لا يوجد دور",
                user.IsActive,
                user.MustChangePassword,
                user.CreatedAt,
                user.LastLoginAt
            ));
        }

        return new PagedResult<UserListDto>(items, totalCount, page, pageSize, (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task<UserListDto?> GetUserByIdAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return null;

        var roles = await _userManager.GetRolesAsync(user);
        return new UserListDto(
            user.Id, user.Email!, user.FullName, user.FullNameAr,
            roles.FirstOrDefault() ?? "لا يوجد دور",
            user.IsActive, user.MustChangePassword, user.CreatedAt, user.LastLoginAt);
    }

    public async Task<UserListDto> CreateUserAsync(CreateUserRequest request)
    {
        // Check if email already exists
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            throw new InvalidOperationException("البريد الإلكتروني مستخدم بالفعل");
        }

        // Ensure role exists
        if (!await _roleManager.RoleExistsAsync(request.Role))
        {
            await _roleManager.CreateAsync(new IdentityRole(request.Role));
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            FullNameAr = request.FullNameAr,
            IsActive = true,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"فشل في إنشاء المستخدم: {errors}");
        }

        await _userManager.AddToRoleAsync(user, request.Role);

        return new UserListDto(
            user.Id, user.Email!, user.FullName, user.FullNameAr,
            request.Role, user.IsActive, user.MustChangePassword,
            user.CreatedAt, user.LastLoginAt);
    }

    public async Task<UserListDto?> UpdateUserAsync(string userId, UpdateUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return null;

        if (request.FullName is not null) user.FullName = request.FullName;
        if (request.FullNameAr is not null) user.FullNameAr = request.FullNameAr;
        if (request.Email is not null)
        {
            user.Email = request.Email;
            user.UserName = request.Email;
        }

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            throw new InvalidOperationException("فشل في تحديث المستخدم");
        }

        // Handle role change
        if (request.Role is not null)
        {
            var currentRoles = await _userManager.GetRolesAsync(user);
            if (currentRoles.FirstOrDefault() != request.Role)
            {
                // Prevent removing last admin
                if (currentRoles.Contains("Admin"))
                {
                    var adminUsers = await _userManager.GetUsersInRoleAsync("Admin");
                    var activeAdmins = adminUsers.Count(u => u.IsActive && u.Id != userId);
                    if (activeAdmins == 0)
                    {
                        throw new InvalidOperationException("لا يمكن إزالة آخر مدير نشط");
                    }
                }

                await _userManager.RemoveFromRolesAsync(user, currentRoles);
                if (!await _roleManager.RoleExistsAsync(request.Role))
                {
                    await _roleManager.CreateAsync(new IdentityRole(request.Role));
                }
                await _userManager.AddToRoleAsync(user, request.Role);
            }
        }

        return await GetUserByIdAsync(userId);
    }

    public async Task<bool> ToggleUserStatusAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return false;

        // Prevent deactivating last admin
        if (user.IsActive)
        {
            var roles = await _userManager.GetRolesAsync(user);
            if (roles.Contains("Admin"))
            {
                var adminUsers = await _userManager.GetUsersInRoleAsync("Admin");
                var activeAdmins = adminUsers.Count(u => u.IsActive && u.Id != userId);
                if (activeAdmins == 0)
                {
                    throw new InvalidOperationException("لا يمكن تعطيل آخر مدير نشط");
                }
            }
        }

        user.IsActive = !user.IsActive;
        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    public async Task<bool> SoftDeleteUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return false;

        // Prevent deleting last admin
        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Contains("Admin"))
        {
            var adminUsers = await _userManager.GetUsersInRoleAsync("Admin");
            var activeAdmins = adminUsers.Count(u => u.IsActive && u.Id != userId);
            if (activeAdmins == 0)
            {
                throw new InvalidOperationException("لا يمكن حذف آخر مدير نشط");
            }
        }

        user.IsActive = false;
        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    public async Task<bool> RestoreUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return false;

        user.IsActive = true;
        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    public async Task<AdminResetPasswordResult> AdminResetPasswordAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new AdminResetPasswordResult(false, null, "لم يتم العثور على المستخدم");
        }

        // Generate temporary password
        var tempPassword = GenerateTemporaryPassword();

        var removeResult = await _userManager.RemovePasswordAsync(user);
        if (!removeResult.Succeeded)
        {
            return new AdminResetPasswordResult(false, null, "فشل في إزالة كلمة المرور القديمة");
        }

        var addResult = await _userManager.AddPasswordAsync(user, tempPassword);
        if (!addResult.Succeeded)
        {
            return new AdminResetPasswordResult(false, null, "فشل في تعيين كلمة المرور الجديدة");
        }

        user.MustChangePassword = true;
        await _userManager.UpdateAsync(user);

        return new AdminResetPasswordResult(true, tempPassword, "تم إعادة تعيين كلمة المرور بنجاح");
    }

    private static string GenerateTemporaryPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";
        const string special = "!@#$%&*";
        const string all = upper + lower + digits + special;

        var random = System.Security.Cryptography.RandomNumberGenerator.Create();
        var bytes = new byte[12];
        random.GetBytes(bytes);

        // Ensure at least one of each category
        var chars = new List<char>
        {
            upper[bytes[0] % upper.Length],
            lower[bytes[1] % lower.Length],
            digits[bytes[2] % digits.Length],
            special[bytes[3] % special.Length],
        };

        for (int i = 4; i < 12; i++)
        {
            chars.Add(all[bytes[i] % all.Length]);
        }

        // Fisher-Yates shuffle
        for (int i = chars.Count - 1; i > 0; i--)
        {
            var j = bytes[i] % (i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }

        return new string(chars.ToArray());
    }
}
