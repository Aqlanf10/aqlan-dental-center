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
}
