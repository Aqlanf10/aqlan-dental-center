using AqlanDental.Domain.Constants;
using AqlanDental.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AqlanDental.Infrastructure.Persistence;

public class InitialSeeder
{
    private readonly AqlanDentalDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ILogger<InitialSeeder> _logger;
    private readonly IConfiguration _configuration;

    public InitialSeeder(
        AqlanDentalDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ILogger<InitialSeeder> logger,
        IConfiguration configuration)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task SeedAsync()
    {
        await SeedRolesAsync();
        await SeedAdminUserAsync();
    }

    private async Task SeedRolesAsync()
    {
        foreach (var roleName in AppRoles.AllRoles)
        {
            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                var result = await _roleManager.CreateAsync(new IdentityRole(roleName));
                if (result.Succeeded)
                {
                    _logger.LogInformation("تم إنشاء الدور: {RoleName}", roleName);
                }
            }
        }
    }

    private async Task SeedAdminUserAsync()
    {
        var adminEmail = "admin@aqlandental.dev";

        if (await _userManager.FindByEmailAsync(adminEmail) is not null)
        {
            return;
        }

        var adminUser = new ApplicationUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            FullName = "System Admin",
            FullNameAr = "مدير النظام",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            EmailConfirmed = true
        };

        var defaultPassword = _configuration["SeedData:AdminPassword"];

        if (string.IsNullOrEmpty(defaultPassword))
        {
            _logger.LogWarning("SeedData:AdminPassword not configured — using default dev password. Set this in production!");
            defaultPassword = "Admin@123456";
        }

        var result = await _userManager.CreateAsync(adminUser, defaultPassword);

        if (result.Succeeded)
        {
            await _userManager.AddToRoleAsync(adminUser, AppRoles.Admin);
            _logger.LogInformation("تم إنشاء حساب المدير الافتراضي");
        }
        else
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            _logger.LogError("فشل في إنشاء حساب المدير: {Errors}", errors);
        }
    }
}
