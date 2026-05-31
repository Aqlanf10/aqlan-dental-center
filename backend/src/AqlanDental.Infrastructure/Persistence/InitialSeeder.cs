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
        await SeedUsersAsync();
        await SeedDoctorsAsync();
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

    private async Task SeedUsersAsync()
    {
        var defaultPassword = _configuration["SeedData:AdminPassword"];
        if (string.IsNullOrEmpty(defaultPassword))
        {
            _logger.LogWarning("SeedData:AdminPassword not configured — using default dev password.");
            defaultPassword = "Admin@123456";
        }

        // --- Admin ---
        await CreateUserIfNotExists(
            email: "admin@aqlandental.dev",
            fullName: "مدير النظام",
            fullNameAr: "مدير النظام",
            password: defaultPassword,
            role: AppRoles.Admin);

        // --- Doctors (also system users) ---
        await CreateUserIfNotExists(
            email: "dr.aqlan@aqlandental.dev",
            fullName: "د. عقلان فهد العقلاني",
            fullNameAr: "د. عقلان فهد العقلاني",
            password: defaultPassword,
            role: AppRoles.Doctor);

        await CreateUserIfNotExists(
            email: "dr.khaled@aqlandental.dev",
            fullName: "د. خالد محمد الأحمدي",
            fullNameAr: "د. خالد محمد الأحمدي",
            password: defaultPassword,
            role: AppRoles.Doctor);

        await CreateUserIfNotExists(
            email: "dr.sara@aqlandental.dev",
            fullName: "د. سارة علي السقاف",
            fullNameAr: "د. سارة علي السقاف",
            password: defaultPassword,
            role: AppRoles.Doctor);

        // --- Reception ---
        await CreateUserIfNotExists(
            email: "reception@aqlandental.dev",
            fullName: "أمينة عبدالله",
            fullNameAr: "أمينة عبدالله",
            password: defaultPassword,
            role: AppRoles.Reception);

        // --- Accountant ---
        await CreateUserIfNotExists(
            email: "accountant@aqlandental.dev",
            fullName: "فاطمة أحمد",
            fullNameAr: "فاطمة أحمد",
            password: defaultPassword,
            role: AppRoles.Accountant);
    }

    private async Task CreateUserIfNotExists(
        string email, string fullName, string fullNameAr, string password, string role)
    {
        if (await _userManager.FindByEmailAsync(email) is not null)
            return;

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = fullName,
            FullNameAr = fullNameAr,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, password);
        if (result.Succeeded)
        {
            await _userManager.AddToRoleAsync(user, role);
            _logger.LogInformation("تم إنشاء حساب: {Email} ({Role})", email, role);
        }
        else
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            _logger.LogError("فشل إنشاء حساب {Email}: {Errors}", email, errors);
        }
    }

    private async Task SeedDoctorsAsync()
    {
        if (await _context.Doctors.AnyAsync())
            return;

        var doctors = new List<Doctor>
        {
            new()
            {
                Id = Guid.Parse("10000001-0000-0000-0000-000000000001"),
                FullName = "د. عقلان فهد العقلاني",
                Specialty = ServiceTypes.Orthodontics,
                PhoneNumber = "+967-770000001",
                Email = "dr.aqlan@aqlandental.dev",
                Color = "#3d7ab5",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.Parse("10000001-0000-0000-0000-000000000002"),
                FullName = "د. خالد محمد الأحمدي",
                Specialty = ServiceTypes.Implants,
                PhoneNumber = "+967-770000002",
                Email = "dr.khaled@aqlandental.dev",
                Color = "#2e7d32",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.Parse("10000001-0000-0000-0000-000000000003"),
                FullName = "د. سارة علي السقاف",
                Specialty = ServiceTypes.Cosmetic,
                PhoneNumber = "+967-770000003",
                Email = "dr.sara@aqlandental.dev",
                Color = "#c2185b",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        _context.Doctors.AddRange(doctors);
        await _context.SaveChangesAsync();
        _logger.LogInformation("تم إضافة {Count} أطباء", doctors.Count);
    }
}
