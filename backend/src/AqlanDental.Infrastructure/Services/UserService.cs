using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Entities;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AqlanDentalDbContext _context;

    public UserService(UserManager<ApplicationUser> userManager, AqlanDentalDbContext context)
    {
        _userManager = userManager;
        _context = context;
    }

    public async Task<UserInfo?> ValidateCredentialsAsync(string email, string password)
    {
        var user = await _userManager.FindByEmailAsync(email);

        if (user is null)
        {
            return null;
        }

        var isPasswordValid = await _userManager.CheckPasswordAsync(user, password);

        if (!isPasswordValid)
        {
            return null;
        }

        if (!user.IsActive)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);

        return new UserInfo(
            UserId: user.Id,
            Email: user.Email!,
            FullName: user.FullName,
            FullNameAr: user.FullNameAr,
            IsActive: user.IsActive,
            MustChangePassword: user.MustChangePassword,
            Roles: roles
        );
    }

    public async Task UpdateLastLoginAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is not null)
        {
            user.LastLoginAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);
        }
    }

    public async Task<UserInfo?> GetUserByIdAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);

        if (user is null)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);

        return new UserInfo(
            UserId: user.Id,
            Email: user.Email!,
            FullName: user.FullName,
            FullNameAr: user.FullNameAr,
            IsActive: user.IsActive,
            MustChangePassword: user.MustChangePassword,
            Roles: roles
        );
    }

    public async Task<IList<string>> GetUserRolesAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new List<string>();
        }

        return await _userManager.GetRolesAsync(user);
    }

    public async Task<ChangePasswordResult> ChangePasswordAsync(string userId, string currentPassword, string newPassword)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new ChangePasswordResult(false, "لم يتم العثور على المستخدم");
        }

        var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            var arabicErrors = MapIdentityErrors(result.Errors);
            return new ChangePasswordResult(false, arabicErrors);
        }

        user.MustChangePassword = false;
        await _userManager.UpdateAsync(user);

        return new ChangePasswordResult(true, "تم تغيير كلمة المرور بنجاح");
    }

    public async Task<GenerateResetTokenResult> GeneratePasswordResetTokenAsync(string usernameOrEmail)
    {
        var user = await _userManager.FindByEmailAsync(usernameOrEmail)
            ?? await _userManager.FindByNameAsync(usernameOrEmail);

        if (user is null)
        {
            return new GenerateResetTokenResult(false, null, "لم يتم العثور على المستخدم");
        }

        // Generate a secure random token
        var tokenBytes = new byte[64];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(tokenBytes);
        var token = Convert.ToBase64String(tokenBytes);

        // Store the reset token
        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            IsUsed = false
        };

        _context.PasswordResetTokens.Add(resetToken);
        await _context.SaveChangesAsync();

        return new GenerateResetTokenResult(true, token, "تم إنشاء رمز إعادة التعيين");
    }

    public async Task<ResetPasswordResult> ResetPasswordAsync(string token, string newPassword)
    {
        var resetToken = await _context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token);

        if (resetToken is null)
        {
            return new ResetPasswordResult(false, "رمز إعادة التعيين غير صالح");
        }

        if (resetToken.IsUsed)
        {
            return new ResetPasswordResult(false, "رمز إعادة التعيين مستخدم بالفعل");
        }

        if (resetToken.IsExpired)
        {
            return new ResetPasswordResult(false, "رمز إعادة التعيين منتهي الصلاحية");
        }

        var user = resetToken.User;
        if (user is null)
        {
            return new ResetPasswordResult(false, "لم يتم العثور على المستخدم");
        }

        // Remove the old password and set new one
        var removeResult = await _userManager.RemovePasswordAsync(user);
        if (!removeResult.Succeeded)
        {
            return new ResetPasswordResult(false, "فشل في إعادة تعيين كلمة المرور");
        }

        var addResult = await _userManager.AddPasswordAsync(user, newPassword);
        if (!addResult.Succeeded)
        {
            // Try to restore old password
            return new ResetPasswordResult(false, MapIdentityErrors(addResult.Errors));
        }

        // Mark token as used
        resetToken.IsUsed = true;
        _context.PasswordResetTokens.Update(resetToken);

        // Clear MustChangePassword flag
        user.MustChangePassword = false;
        await _userManager.UpdateAsync(user);

        // Revoke all refresh tokens for security
        await RevokeAllRefreshTokensAsync(user.Id);

        await _context.SaveChangesAsync();

        return new ResetPasswordResult(true, "تم إعادة تعيين كلمة المرور بنجاح");
    }

    public async Task RevokeAllRefreshTokensAsync(string userId)
    {
        var tokens = await _context.RefreshTokens
            .Where(t => t.UserId == userId && !t.IsRevoked && !t.IsUsed)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.IsRevoked = true;
        }

        _context.RefreshTokens.UpdateRange(tokens);
        await _context.SaveChangesAsync();
    }

    private static string MapIdentityErrors(IEnumerable<IdentityError> errors)
    {
        var errorList = errors.ToList();
        if (errorList.Count == 0) return "حدث خطأ غير متوقع";

        var messages = errorList.Select(e => e.Code switch
        {
            "PasswordTooShort" => "كلمة المرور قصيرة جداً. يجب أن تكون 8 أحرف على الأقل",
            "PasswordRequiresNonAlphanumeric" => "كلمة المرور يجب أن تحتوي على حرف خاص واحد على الأقل",
            "PasswordRequiresDigit" => "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل",
            "PasswordRequiresUpper" => "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل",
            "PasswordRequiresLower" => "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل",
            "PasswordMismatch" => "كلمة المرور الحالية غير صحيحة",
            "DuplicateUserName" => "اسم المستخدم مستخدم بالفعل",
            "DuplicateEmail" => "البريد الإلكتروني مستخدم بالفعل",
            _ => e.Description
        });

        return string.Join(". ", messages);
    }
}
