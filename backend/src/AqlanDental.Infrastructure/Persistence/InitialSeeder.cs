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

    // Fixed GUIDs for deterministic seed data
    private static readonly Guid DrAqlanId = Guid.Parse("10000001-0000-0000-0000-000000000001");
    private static readonly Guid DrKhaledId = Guid.Parse("10000001-0000-0000-0000-000000000002");
    private static readonly Guid DrSaraId = Guid.Parse("10000001-0000-0000-0000-000000000003");
    private static readonly Guid MainVaultId = Guid.Parse("20000001-0000-0000-0000-000000000001");
    private static readonly Guid BankAccountId = Guid.Parse("20000001-0000-0000-0000-000000000002");

    // Patient IDs
    private static readonly Guid P1 = Guid.Parse("30000001-0000-0000-0000-000000000001");
    private static readonly Guid P2 = Guid.Parse("30000001-0000-0000-0000-000000000002");
    private static readonly Guid P3 = Guid.Parse("30000001-0000-0000-0000-000000000003");
    private static readonly Guid P4 = Guid.Parse("30000001-0000-0000-0000-000000000004");
    private static readonly Guid P5 = Guid.Parse("30000001-0000-0000-0000-000000000005");
    private static readonly Guid P6 = Guid.Parse("30000001-0000-0000-0000-000000000006");
    private static readonly Guid P7 = Guid.Parse("30000001-0000-0000-0000-000000000007");
    private static readonly Guid P8 = Guid.Parse("30000001-0000-0000-0000-000000000008");
    private static readonly Guid P9 = Guid.Parse("30000001-0000-0000-0000-000000000009");
    private static readonly Guid P10 = Guid.Parse("30000001-0000-0000-0000-000000000010");
    private static readonly Guid P11 = Guid.Parse("30000001-0000-0000-0000-000000000011");
    private static readonly Guid P12 = Guid.Parse("30000001-0000-0000-0000-000000000012");
    private static readonly Guid P13 = Guid.Parse("30000001-0000-0000-0000-000000000013");
    private static readonly Guid P14 = Guid.Parse("30000001-0000-0000-0000-000000000014");
    private static readonly Guid P15 = Guid.Parse("30000001-0000-0000-0000-000000000015");

    // Service IDs
    private static readonly Guid SvcConsult = Guid.Parse("40000001-0000-0000-0000-000000000001");
    private static readonly Guid SvcScaling = Guid.Parse("40000001-0000-0000-0000-000000000002");
    private static readonly Guid SvcFilling = Guid.Parse("40000001-0000-0000-0000-000000000003");
    private static readonly Guid SvcRootCanal = Guid.Parse("40000001-0000-0000-0000-000000000004");
    private static readonly Guid SvcCrown = Guid.Parse("40000001-0000-0000-0000-000000000005");
    private static readonly Guid SvcBridge = Guid.Parse("40000001-0000-0000-0000-000000000006");
    private static readonly Guid SvcOrtho = Guid.Parse("40000001-0000-0000-0000-000000000007");
    private static readonly Guid SvcImplant = Guid.Parse("40000001-0000-0000-0000-000000000008");
    private static readonly Guid SvcExtraction = Guid.Parse("40000001-0000-0000-0000-000000000009");
    private static readonly Guid SvcWisdom = Guid.Parse("40000001-0000-0000-0000-000000000010");
    private static readonly Guid SvcWhitening = Guid.Parse("40000001-0000-0000-0000-000000000011");
    private static readonly Guid SvcVeneer = Guid.Parse("40000001-0000-0000-0000-000000000012");
    private static readonly Guid SvcPanoramic = Guid.Parse("40000001-0000-0000-0000-000000000013");
    private static readonly Guid SvcPeriapical = Guid.Parse("40000001-0000-0000-0000-000000000014");
    private static readonly Guid SvcFillingNormal = Guid.Parse("40000001-0000-0000-0000-000000000015");

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
        await SeedClinicSettingsAsync();
        await SeedBranchesAsync();
        await SeedClinicRoomsAsync();
        await SeedClinicServicesAsync();
        await SeedPatientsAsync();
        await SeedMedicalHistoriesAsync();
        await SeedDentalHistoriesAsync();
        await SeedTreasuriesAsync();
        await SeedCashierSessionAsync();
        await SeedContractsAsync();
        await SeedInvoicesAsync();
        await SeedPaymentsAsync();
        await SeedAppointmentsAsync();
        await SeedEmployeesAsync();
        await SeedSuppliersAsync();
        await SeedSupplierBillsAsync();
        await SeedSupplierBillPaymentsAsync();
        await SeedInventoryItemsAsync();
        await SeedDoctorWeeklySchedulesAsync();
        await SeedOperationalExpensesAsync();
        await SeedLabOrdersAsync();
        await SeedNotificationsAsync();
        await SeedSettingsAsync();

        _logger.LogInformation("✅ تم الانتهاء من جميع بيانات البذرة بنجاح");
    }

    private async Task SeedRolesAsync()
    {
        foreach (var roleName in AppRoles.AllRoles)
        {
            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                var result = await _roleManager.CreateAsync(new IdentityRole(roleName));
                if (result.Succeeded)
                    _logger.LogInformation("تم إنشاء الدور: {RoleName}", roleName);
            }
        }
    }

    private async Task SeedUsersAsync()
    {
        var defaultPassword = _configuration["SeedData:AdminPassword"] ?? "Admin@123456";

        await CreateUserIfNotExists("admin@aqlandental.dev", "مدير النظام", "مدير النظام", defaultPassword, AppRoles.Admin);
        await CreateUserIfNotExists("dr.aqlan@aqlandental.dev", "د. عقلان فهد العقلاني", "د. عقلان فهد العقلاني", defaultPassword, AppRoles.Doctor);
        await CreateUserIfNotExists("dr.khaled@aqlandental.dev", "د. خالد محمد الأحمدي", "د. خالد محمد الأحمدي", defaultPassword, AppRoles.Doctor);
        await CreateUserIfNotExists("dr.sara@aqlandental.dev", "د. سارة علي السقاف", "د. سارة علي السقاف", defaultPassword, AppRoles.Doctor);
        await CreateUserIfNotExists("reception@aqlandental.dev", "أمينة عبدالله", "أمينة عبدالله", defaultPassword, AppRoles.Reception);
        await CreateUserIfNotExists("accountant@aqlandental.dev", "فاطمة أحمد", "فاطمة أحمد", defaultPassword, AppRoles.Accountant);
    }

    private async Task CreateUserIfNotExists(string email, string fullName, string fullNameAr, string password, string role)
    {
        if (await _userManager.FindByEmailAsync(email) is not null) return;
        var user = new ApplicationUser
        {
            UserName = email, Email = email, FullName = fullName, FullNameAr = fullNameAr,
            IsActive = true, CreatedAt = DateTime.UtcNow, EmailConfirmed = true
        };
        var result = await _userManager.CreateAsync(user, password);
        if (result.Succeeded)
            await _userManager.AddToRoleAsync(user, role);
    }

    private async Task SeedDoctorsAsync()
    {
        if (await _context.Doctors.AnyAsync()) return;
        var doctors = new List<Doctor>
        {
            new() { Id = DrAqlanId, FullName = "د. عقلان فهد العقلاني", Specialty = ServiceTypes.Orthodontics, PhoneNumber = "+967770000001", Email = "dr.aqlan@aqlandental.dev", Color = "#3d7ab5", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = DrKhaledId, FullName = "د. خالد محمد الأحمدي", Specialty = ServiceTypes.Implants, PhoneNumber = "+967770000002", Email = "dr.khaled@aqlandental.dev", Color = "#2e7d32", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = DrSaraId, FullName = "د. سارة علي السقاف", Specialty = ServiceTypes.Cosmetic, PhoneNumber = "+967770000003", Email = "dr.sara@aqlandental.dev", Color = "#c2185b", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        };
        _context.Doctors.AddRange(doctors);
        await _context.SaveChangesAsync();
    }

    private async Task SeedClinicSettingsAsync()
    {
        if (await _context.ClinicSettings.AnyAsync()) return;
        _context.ClinicSettings.Add(new ClinicSettings
        {
            Id = 1, ClinicNameAr = "مركز عقلان لطب الأسنان", ClinicNameEn = "Aqlan Dental Center",
            PhoneNumber = "+967-1-234567", Address = "صنعاء - شارع الزبيري", CurrencyDefault = "YER", UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
    }

    private async Task SeedBranchesAsync()
    {
        if (await _context.Branches.AnyAsync()) return;
        _context.Branches.AddRange(
            new Branch { Id = Guid.NewGuid(), Name = "الفرع الرئيسي - صنعاء", Address = "صنعاء - شارع الزبيري", Phone = "+967-1-234567", IsMain = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Branch { Id = Guid.NewGuid(), Name = "فرع عدن", Address = "عدن - المنصورة", Phone = "+967-2-345678", IsMain = false, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedClinicRoomsAsync()
    {
        if (await _context.ClinicRooms.AnyAsync()) return;
        for (int i = 1; i <= 4; i++)
        {
            _context.ClinicRooms.Add(new ClinicRoom
            {
                Id = Guid.NewGuid(), Name = $"غرفة {i}", RoomNumber = $"R-{i:D2}",
                Description = i <= 2 ? "غرفة علاج عام" : "غرفة تخصصية",
                IsActive = true, IsOccupied = false, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync();
    }

    private async Task SeedClinicServicesAsync()
    {
        if (await _context.ClinicServices.AnyAsync()) return;
        var services = new List<ClinicService>
        {
            new() { Id = SvcConsult, ArabicName = "تشخيص وفحص", EnglishName = "Consultation & Examination", Code = "CONS", Category = ServiceCategory.Consultation, DefaultDurationMinutes = 15, DefaultPrice = 5000, SortOrder = 1, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcScaling, ArabicName = "تنظيف الأسنان", EnglishName = "Scaling & Polishing", Code = "SCAL", Category = ServiceCategory.Preventive, DefaultDurationMinutes = 30, DefaultPrice = 8000, SortOrder = 2, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcFillingNormal, ArabicName = "حشوة عادية", EnglishName = "Normal Filling", Code = "FILL-N", Category = ServiceCategory.Restorative, DefaultDurationMinutes = 20, DefaultPrice = 7000, SortOrder = 3, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcFilling, ArabicName = "حشوة ضوئية", EnglishName = "Light Cure Filling", Code = "FILL-L", Category = ServiceCategory.Restorative, DefaultDurationMinutes = 30, DefaultPrice = 10000, SortOrder = 4, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcRootCanal, ArabicName = "علاج عصب", EnglishName = "Root Canal Treatment", Code = "RCT", Category = ServiceCategory.Endodontics, DefaultDurationMinutes = 60, DefaultPrice = 25000, SortOrder = 5, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcCrown, ArabicName = "تاج خزفي", EnglishName = "Porcelain Crown", Code = "CROWN", Category = ServiceCategory.Prosthodontics, DefaultDurationMinutes = 45, DefaultPrice = 40000, SortOrder = 6, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcBridge, ArabicName = "جسر أسنان", EnglishName = "Dental Bridge", Code = "BRIDGE", Category = ServiceCategory.Prosthodontics, DefaultDurationMinutes = 60, DefaultPrice = 70000, SortOrder = 7, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcOrtho, ArabicName = "تقويم أسنان", EnglishName = "Orthodontics", Code = "ORTHO", Category = ServiceCategory.Orthodontics, DefaultDurationMinutes = 30, DefaultPrice = 300000, SortOrder = 8, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcImplant, ArabicName = "زراعة أسنان", EnglishName = "Dental Implant", Code = "IMPLANT", Category = ServiceCategory.Surgery, DefaultDurationMinutes = 90, DefaultPrice = 200000, SortOrder = 9, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcExtraction, ArabicName = "خلع ضرس", EnglishName = "Tooth Extraction", Code = "EXTRACT", Category = ServiceCategory.Surgery, DefaultDurationMinutes = 20, DefaultPrice = 8000, SortOrder = 10, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcWisdom, ArabicName = "خلع ضرس عقل", EnglishName = "Wisdom Tooth Extraction", Code = "WISDOM", Category = ServiceCategory.Surgery, DefaultDurationMinutes = 30, DefaultPrice = 15000, SortOrder = 11, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcWhitening, ArabicName = "تبييض أسنان", EnglishName = "Teeth Whitening", Code = "WHITE", Category = ServiceCategory.Cosmetic, DefaultDurationMinutes = 45, DefaultPrice = 30000, SortOrder = 12, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcVeneer, ArabicName = "فينير", EnglishName = "Dental Veneer", Code = "VENEER", Category = ServiceCategory.Cosmetic, DefaultDurationMinutes = 45, DefaultPrice = 50000, SortOrder = 13, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcPanoramic, ArabicName = "أشعة بانورامية", EnglishName = "Panoramic X-Ray", Code = "XRAY-PAN", Category = ServiceCategory.Radiology, DefaultDurationMinutes = 10, DefaultPrice = 5000, RequiresDoctor = false, SortOrder = 14, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = SvcPeriapical, ArabicName = "أشعة حول السن", EnglishName = "Periapical X-Ray", Code = "XRAY-PER", Category = ServiceCategory.Radiology, DefaultDurationMinutes = 5, DefaultPrice = 2000, RequiresDoctor = false, SortOrder = 15, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        };
        _context.ClinicServices.AddRange(services);
        await _context.SaveChangesAsync();
    }

    private async Task SeedPatientsAsync()
    {
        if (await _context.Patients.AnyAsync()) return;
        var patients = new List<Patient>
        {
            new() { Id = P1, PatientNumber = "P-0001", FullName = "أحمد محمد العمري", Gender = Gender.Male, DateOfBirth = new DateOnly(1991, 3, 15), PhoneNumber = "+967770010001", WhatsAppNumber = "+967770010001", Address = "صنعاء - شارع الستين", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P2, PatientNumber = "P-0002", FullName = "فاطمة علي السقاف", Gender = Gender.Female, DateOfBirth = new DateOnly(1998, 7, 22), PhoneNumber = "+967770010002", WhatsAppNumber = "+967770010002", Address = "صنعاء - حي الزبيري", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P3, PatientNumber = "P-0003", FullName = "محمد عبدالله الحميدي", Gender = Gender.Male, DateOfBirth = new DateOnly(1984, 1, 10), PhoneNumber = "+967770010003", Address = "صنعاء - شارع الزبيري", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P4, PatientNumber = "P-0004", FullName = "سعاد حسن الأحمدي", Gender = Gender.Female, DateOfBirth = new DateOnly(1971, 11, 5), PhoneNumber = "+967770010004", WhatsAppNumber = "+967770010004", Address = "عدن - المنصورة", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P5, PatientNumber = "P-0005", FullName = "خالد يحيى الشميري", Gender = Gender.Male, DateOfBirth = new DateOnly(2004, 9, 18), PhoneNumber = "+967770010005", Address = "صنعاء - شارع بدر", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P6, PatientNumber = "P-0006", FullName = "نورة سالم الباره", Gender = Gender.Female, DateOfBirth = new DateOnly(1996, 4, 30), PhoneNumber = "+967770010006", WhatsAppNumber = "+967770010006", Address = "صنعاء - حي الأصبحي", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P7, PatientNumber = "P-0007", FullName = "عبدالرحمن قاسم النعمان", Gender = Gender.Male, DateOfBirth = new DateOnly(1981, 6, 12), PhoneNumber = "+967770010007", Address = "صنعاء - شارع المطار", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P8, PatientNumber = "P-0008", FullName = "هدى صالح عقلان", Gender = Gender.Female, DateOfBirth = new DateOnly(1988, 2, 28), PhoneNumber = "+967770010008", WhatsAppNumber = "+967770010008", Address = "صنعاء - حي الزبيري", Notes = "التح حساسية للبنسلين", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P9, PatientNumber = "P-0009", FullName = "يوسف إبراهيم الحداد", Gender = Gender.Male, DateOfBirth = new DateOnly(1966, 12, 3), PhoneNumber = "+967770010009", Address = "عدن - كريتر", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P10, PatientNumber = "P-0010", FullName = "أمل راشد الكبسي", Gender = Gender.Female, DateOfBirth = new DateOnly(2001, 8, 14), PhoneNumber = "+967770010010", WhatsAppNumber = "+967770010010", Address = "صنعاء - شارع الستين", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P11, PatientNumber = "P-0011", FullName = "عمر فارع المحمدي", Gender = Gender.Male, DateOfBirth = new DateOnly(1993, 5, 20), PhoneNumber = "+967770010011", Address = "صنعاء - حي النصر", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P12, PatientNumber = "P-0012", FullName = "رنا مختار الأنسي", Gender = Gender.Female, DateOfBirth = new DateOnly(1997, 10, 8), PhoneNumber = "+967770010012", WhatsAppNumber = "+967770010012", Address = "صنعاء - شارع الزبيري", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P13, PatientNumber = "P-0013", FullName = "سالم عبدالرب الحميدي", Gender = Gender.Male, DateOfBirth = new DateOnly(1976, 3, 25), PhoneNumber = "+967770010013", Address = "تعز - المطار", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P14, PatientNumber = "P-0014", FullName = "مريم أحمد السقاف", Gender = Gender.Female, DateOfBirth = new DateOnly(2006, 1, 17), PhoneNumber = "+967770010014", WhatsAppNumber = "+967770010014", Address = "صنعاء - حي الزبيري", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = P15, PatientNumber = "P-0015", FullName = "طارق محمود الزبيري", Gender = Gender.Male, DateOfBirth = new DateOnly(1986, 7, 7), PhoneNumber = "+967770010015", Address = "صنعاء - شارع الزبيري", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        };
        _context.Patients.AddRange(patients);
        await _context.SaveChangesAsync();
    }

    private async Task SeedMedicalHistoriesAsync()
    {
        if (await _context.MedicalHistories.AnyAsync()) return;
        var histories = new List<MedicalHistory>
        {
            new() { Id = Guid.NewGuid(), PatientId = P1, ChronicDiseases = null, CurrentMedications = null, DrugAllergies = "بنسلين", BleedingDisorders = false, IsPregnant = "no", TmjProblems = false, Notes = null, IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P2, ChronicDiseases = null, CurrentMedications = null, DrugAllergies = null, BleedingDisorders = false, IsPregnant = "no", TmjProblems = false, IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P3, ChronicDiseases = "ضغط مرتفع", CurrentMedications = "أملوديبين 5 ملغ", DrugAllergies = null, BleedingDisorders = false, IsPregnant = "no", TmjProblems = false, IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P4, ChronicDiseases = "سكري نوع 2", CurrentMedications = "ميتفورمين 500 ملغ", DrugAllergies = "سلفا", BleedingDisorders = false, IsPregnant = "no", TmjProblems = true, Notes = "آلام في مفصل الفك", IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P8, ChronicDiseases = null, CurrentMedications = null, DrugAllergies = "بنسلين, أسبرين", BleedingDisorders = true, IsPregnant = "no", TmjProblems = false, Notes = "تحذير: اضطرابات نزيف", IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P10, ChronicDiseases = null, CurrentMedications = null, DrugAllergies = null, BleedingDisorders = false, IsPregnant = "yes", TmjProblems = false, Notes = "حامل - الشهر السادس", IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P9, ChronicDiseases = "ضغط مرتفع, روماتيزم", CurrentMedications = "أملوديبين, إيبوبروفين", DrugAllergies = null, BleedingDisorders = false, IsPregnant = "no", TmjProblems = true, IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P14, ChronicDiseases = null, CurrentMedications = null, DrugAllergies = null, BleedingDisorders = false, IsPregnant = "no", TmjProblems = false, IsActive = true }
        };
        _context.MedicalHistories.AddRange(histories);
        await _context.SaveChangesAsync();
    }

    private async Task SeedDentalHistoriesAsync()
    {
        if (await _context.DentalHistories.AnyAsync()) return;
        var histories = new List<DentalHistory>
        {
            new() { Id = Guid.NewGuid(), PatientId = P1, ChiefComplaint = "ألم في ضرس العقل السفلي الأيسر", MouthBreathing = false, Bruxism = false, ThumbSucking = false, TongueThrusting = false, IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P2, ChiefComplaint = "تريد تقويم أسنان", MouthBreathing = false, Bruxism = false, ThumbSucking = false, TongueThrusting = false, PreviousTreatments = "تنظيف سنوي", IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P3, ChiefComplaint = "تسوس في عدة أسنان", MouthBreathing = false, Bruxism = true, ThumbSucking = false, TongueThrusting = false, PreviousTreatments = "حشوات متعددة", IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P5, ChiefComplaint = "ألم في الضرس العلوي", MouthBreathing = true, Bruxism = false, ThumbSucking = false, TongueThrusting = false, IsActive = true },
            new() { Id = Guid.NewGuid(), PatientId = P8, ChiefComplaint = "تريد تجميل أسنان", MouthBreathing = false, Bruxism = false, ThumbSucking = false, TongueThrusting = false, PreviousTreatments = "تقويم سابق", IsActive = true }
        };
        _context.DentalHistories.AddRange(histories);
        await _context.SaveChangesAsync();
    }

    private async Task SeedTreasuriesAsync()
    {
        if (await _context.Treasuries.AnyAsync()) return;
        _context.Treasuries.AddRange(
            new Treasury { Id = MainVaultId, Name = "الخزنة الرئيسية", Type = TreasuryType.Vault, Balance = 500000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Treasury { Id = BankAccountId, Name = "الحساب البنكي - بنك اليمن والكويت", Type = TreasuryType.Bank, Balance = 1000000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedCashierSessionAsync()
    {
        if (await _context.CashierSessions.AnyAsync()) return;
        var adminUser = await _userManager.FindByEmailAsync("admin@aqlandental.dev");
        _context.CashierSessions.Add(new CashierSession
        {
            Id = Guid.NewGuid(), SessionNumber = "SES-0001", CashierId = adminUser!.Id,
            OpeningTime = DateTime.UtcNow, OpeningBalance = 100000, ExpectedClosingCash = 100000,
            Status = SessionStatus.Open, Notes = "جلسة افتتاحية", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
    }

    private async Task SeedContractsAsync()
    {
        if (await _context.Contracts.AnyAsync()) return;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        _context.Contracts.AddRange(
            new Contract { Id = Guid.NewGuid(), PatientId = P2, Specialty = "تقويم أسنان", TotalAmount = 300000, DownPayment = 100000, InstallmentsCount = 10, InstallmentAmount = 20000, StartDate = today, DiscountAmount = 0, Status = ContractStatus.Active, Notes = "تقويم معدني علوي وسفلي", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Contract { Id = Guid.NewGuid(), PatientId = P7, Specialty = "زراعة أسنان", TotalAmount = 200000, DownPayment = 50000, InstallmentsCount = 6, InstallmentAmount = 25000, StartDate = today.AddDays(-30), DiscountAmount = 0, Status = ContractStatus.Active, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Contract { Id = Guid.NewGuid(), PatientId = P4, Specialty = "تقويم أسنان", TotalAmount = 350000, DownPayment = 150000, InstallmentsCount = 8, InstallmentAmount = 25000, StartDate = today.AddDays(-60), DiscountAmount = 10000, DiscountReason = "عميلة دائمة", Status = ContractStatus.Active, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Contract { Id = Guid.NewGuid(), PatientId = P15, Specialty = "زراعة أسنان", TotalAmount = 400000, DownPayment = 200000, InstallmentsCount = 4, InstallmentAmount = 50000, StartDate = today.AddDays(-90), DiscountAmount = 0, Status = ContractStatus.Completed, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Contract { Id = Guid.NewGuid(), PatientId = P6, Specialty = "تجميل أسنان", TotalAmount = 100000, DownPayment = 50000, InstallmentsCount = 5, InstallmentAmount = 10000, StartDate = today.AddDays(-10), DiscountAmount = 5000, DiscountReason = "خصم خاص", Status = ContractStatus.Active, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedInvoicesAsync()
    {
        if (await _context.Invoices.AnyAsync()) return;
        var inv1 = Guid.NewGuid();
        var inv2 = Guid.NewGuid();
        var inv3 = Guid.NewGuid();
        var inv4 = Guid.NewGuid();

        _context.Invoices.AddRange(
            new Invoice { Id = inv1, PatientId = P1, InvoiceNumber = "INV-00001", Status = InvoiceStatus.Paid, Subtotal = 18000, DiscountAmount = 0, TaxAmount = 0, TotalAmount = 18000, IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-5), UpdatedAt = DateTime.UtcNow },
            new Invoice { Id = inv2, PatientId = P3, InvoiceNumber = "INV-00002", Status = InvoiceStatus.Issued, Subtotal = 35000, DiscountAmount = 5000, TaxAmount = 0, TotalAmount = 30000, IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-2), UpdatedAt = DateTime.UtcNow },
            new Invoice { Id = inv3, PatientId = P5, InvoiceNumber = "INV-00003", Status = InvoiceStatus.Draft, Subtotal = 8000, DiscountAmount = 0, TaxAmount = 0, TotalAmount = 8000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Invoice { Id = inv4, PatientId = P11, InvoiceNumber = "INV-00004", Status = InvoiceStatus.Issued, Subtotal = 50000, DiscountAmount = 0, TaxAmount = 0, TotalAmount = 50000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );

        _context.InvoiceLineItems.AddRange(
            new InvoiceLineItem { Id = Guid.NewGuid(), InvoiceId = inv1, ClinicServiceId = SvcExtraction, ServiceNameSnapshot = "خلع ضرس", Quantity = 1, UnitPrice = 8000, TotalPrice = 8000, LineDiscountAmount = 0, SortOrder = 1, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InvoiceLineItem { Id = Guid.NewGuid(), InvoiceId = inv1, ClinicServiceId = SvcPeriapical, ServiceNameSnapshot = "أشعة حول السن", Quantity = 1, UnitPrice = 2000, TotalPrice = 2000, LineDiscountAmount = 0, SortOrder = 2, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InvoiceLineItem { Id = Guid.NewGuid(), InvoiceId = inv1, ClinicServiceId = SvcConsult, ServiceNameSnapshot = "تشخيص وفحص", Quantity = 1, UnitPrice = 5000, TotalPrice = 5000, LineDiscountAmount = 0, SortOrder = 3, DoctorId = DrKhaledId, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InvoiceLineItem { Id = Guid.NewGuid(), InvoiceId = inv2, ClinicServiceId = SvcFilling, ServiceNameSnapshot = "حشوة ضوئية", Quantity = 2, UnitPrice = 10000, TotalPrice = 20000, LineDiscountAmount = 0, SortOrder = 1, DoctorId = DrAqlanId, ToothNumber = "26", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InvoiceLineItem { Id = Guid.NewGuid(), InvoiceId = inv2, ClinicServiceId = SvcRootCanal, ServiceNameSnapshot = "علاج عصب", Quantity = 1, UnitPrice = 25000, TotalPrice = 25000, LineDiscountAmount = 5000, SortOrder = 2, DoctorId = DrAqlanId, ToothNumber = "36", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InvoiceLineItem { Id = Guid.NewGuid(), InvoiceId = inv3, ClinicServiceId = SvcScaling, ServiceNameSnapshot = "تنظيف أسنان", Quantity = 1, UnitPrice = 8000, TotalPrice = 8000, LineDiscountAmount = 0, SortOrder = 1, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InvoiceLineItem { Id = Guid.NewGuid(), InvoiceId = inv4, ClinicServiceId = SvcVeneer, ServiceNameSnapshot = "فينير", Quantity = 1, UnitPrice = 50000, TotalPrice = 50000, LineDiscountAmount = 0, SortOrder = 1, DoctorId = DrSaraId, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedPaymentsAsync()
    {
        if (await _context.Payments.AnyAsync()) return;
        _context.Payments.AddRange(
            new Payment { Id = Guid.NewGuid(), PatientId = P1, Amount = 18000, PaymentDate = DateTime.UtcNow.AddDays(-5), PaymentMethod = PaymentMethod.Cash, ServiceDescription = "خلع ضرس + أشعة + فحص", DoctorId = DrKhaledId, ReceiptNumber = "REC-00001", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Payment { Id = Guid.NewGuid(), PatientId = P2, Amount = 100000, PaymentDate = DateTime.UtcNow.AddDays(-7), PaymentMethod = PaymentMethod.BankTransfer, ServiceDescription = "دفعة مقدمة - تقويم", ContractId = _context.Contracts.FirstOrDefault(c => c.PatientId == P2)?.Id, DoctorId = DrAqlanId, ReceiptNumber = "REC-00002", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Payment { Id = Guid.NewGuid(), PatientId = P2, Amount = 20000, PaymentDate = DateTime.UtcNow.AddDays(-1), PaymentMethod = PaymentMethod.Cash, ServiceDescription = "قسط تقويم - 1", ContractId = _context.Contracts.FirstOrDefault(c => c.PatientId == P2)?.Id, DoctorId = DrAqlanId, ReceiptNumber = "REC-00003", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Payment { Id = Guid.NewGuid(), PatientId = P7, Amount = 50000, PaymentDate = DateTime.UtcNow.AddDays(-30), PaymentMethod = PaymentMethod.Cash, ServiceDescription = "دفعة مقدمة - زراعة", ContractId = _context.Contracts.FirstOrDefault(c => c.PatientId == P7)?.Id, DoctorId = DrKhaledId, ReceiptNumber = "REC-00004", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Payment { Id = Guid.NewGuid(), PatientId = P15, Amount = 200000, PaymentDate = DateTime.UtcNow.AddDays(-90), PaymentMethod = PaymentMethod.BankTransfer, ServiceDescription = "دفعة مقدمة - زراعة", ContractId = _context.Contracts.FirstOrDefault(c => c.PatientId == P15)?.Id, DoctorId = DrKhaledId, ReceiptNumber = "REC-00005", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Payment { Id = Guid.NewGuid(), PatientId = P15, Amount = 200000, PaymentDate = DateTime.UtcNow.AddDays(-30), PaymentMethod = PaymentMethod.BankTransfer, ServiceDescription = "دفعة نهائية - زراعة", ContractId = _context.Contracts.FirstOrDefault(c => c.PatientId == P15)?.Id, DoctorId = DrKhaledId, ReceiptNumber = "REC-00006", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Payment { Id = Guid.NewGuid(), PatientId = P4, Amount = 150000, PaymentDate = DateTime.UtcNow.AddDays(-60), PaymentMethod = PaymentMethod.Cash, ServiceDescription = "دفعة مقدمة - تقويم", DoctorId = DrAqlanId, ReceiptNumber = "REC-00007", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Payment { Id = Guid.NewGuid(), PatientId = P6, Amount = 50000, PaymentDate = DateTime.UtcNow.AddDays(-10), PaymentMethod = PaymentMethod.Card, ServiceDescription = "دفعة مقدمة - تجميل", DoctorId = DrSaraId, ReceiptNumber = "REC-00008", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Payment { Id = Guid.NewGuid(), PatientId = P3, Amount = 15000, PaymentDate = DateTime.UtcNow, PaymentMethod = PaymentMethod.Cash, ServiceDescription = "دفعة جزئية فاتورة", DoctorId = DrAqlanId, ReceiptNumber = "REC-00009", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedAppointmentsAsync()
    {
        if (await _context.Appointments.AnyAsync()) return;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        _context.Appointments.AddRange(
            new Appointment { Id = Guid.NewGuid(), PatientId = P1, DoctorId = DrKhaledId, AppointmentDate = today, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(9, 30), ServiceType = "فحص", Status = AppointmentStatus.Confirmed, Notes = "متابعة خلع ضرس", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Appointment { Id = Guid.NewGuid(), PatientId = P3, DoctorId = DrAqlanId, AppointmentDate = today, StartTime = new TimeOnly(10, 0), EndTime = new TimeOnly(11, 0), ServiceType = "علاج عصب", Status = AppointmentStatus.Scheduled, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Appointment { Id = Guid.NewGuid(), PatientId = P5, DoctorId = DrAqlanId, AppointmentDate = today, StartTime = new TimeOnly(11, 30), EndTime = new TimeOnly(12, 0), ServiceType = "تنظيف", Status = AppointmentStatus.Scheduled, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Appointment { Id = Guid.NewGuid(), PatientId = P8, DoctorId = DrSaraId, AppointmentDate = today, StartTime = new TimeOnly(13, 0), EndTime = new TimeOnly(14, 0), ServiceType = "تجميل", Status = AppointmentStatus.Confirmed, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Appointment { Id = Guid.NewGuid(), PatientId = P10, DoctorId = DrSaraId, AppointmentDate = today, StartTime = new TimeOnly(14, 30), EndTime = new TimeOnly(15, 0), ServiceType = "تبييض", Status = AppointmentStatus.Scheduled, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Appointment { Id = Guid.NewGuid(), PatientId = P2, DoctorId = DrAqlanId, AppointmentDate = today, StartTime = new TimeOnly(15, 30), EndTime = new TimeOnly(16, 0), ServiceType = "تقويم", Status = AppointmentStatus.Scheduled, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Appointment { Id = Guid.NewGuid(), PatientId = P7, DoctorId = DrKhaledId, AppointmentDate = today.AddDays(1), StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 30), ServiceType = "زراعة", Status = AppointmentStatus.Scheduled, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Appointment { Id = Guid.NewGuid(), PatientId = P12, DoctorId = DrAqlanId, AppointmentDate = today.AddDays(1), StartTime = new TimeOnly(11, 0), EndTime = new TimeOnly(11, 30), ServiceType = "فحص تقويم", Status = AppointmentStatus.Scheduled, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Appointment { Id = Guid.NewGuid(), PatientId = P9, DoctorId = DrKhaledId, AppointmentDate = today.AddDays(-3), StartTime = new TimeOnly(10, 0), EndTime = new TimeOnly(10, 30), ServiceType = "خلع", Status = AppointmentStatus.Completed, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Appointment { Id = Guid.NewGuid(), PatientId = P13, DoctorId = DrAqlanId, AppointmentDate = today.AddDays(-5), StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(15, 0), ServiceType = "تقويم", Status = AppointmentStatus.NoShow, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedEmployeesAsync()
    {
        if (await _context.Employees.AnyAsync()) return;
        _context.Employees.AddRange(
            new Employee { Id = Guid.NewGuid(), FullName = "سعاد أحمد المطري", Phone = "+967770020001", Position = "سكرتير", HireDate = new DateOnly(2022, 1, 15), BaseSalary = 120000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Employee { Id = Guid.NewGuid(), FullName = "علي حسين القرموش", Phone = "+967770020002", Position = "فني مختبر", HireDate = new DateOnly(2023, 3, 1), BaseSalary = 100000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Employee { Id = Guid.NewGuid(), FullName = "منى صالح الشرجبي", Phone = "+967770020003", Position = "ممرض أسنان", HireDate = new DateOnly(2023, 6, 15), BaseSalary = 80000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Employee { Id = Guid.NewGuid(), FullName = "أحمد عبدالرحمن الرشيدي", Phone = "+967770020004", Position = "محاسب", HireDate = new DateOnly(2021, 9, 1), BaseSalary = 150000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedSuppliersAsync()
    {
        if (await _context.Suppliers.AnyAsync()) return;
        _context.Suppliers.AddRange(
            new Supplier { Id = Guid.NewGuid(), Name = "شركة اليمن لمستلزمات الأسنان", ContactPerson = "أحمد الشميري", Phone = "+967-1-456789", Email = "info@yemandental.com", Address = "صنعاء - شارع الزبيري", Balance = 75000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Supplier { Id = Guid.NewGuid(), Name = "مؤسسة الخليج الطبية", ContactPerson = "خالد العتيبي", Phone = "+966-5-12345678", Email = "sales@gulfmedical.sa", Address = "الرياض - السعودية", Balance = 0, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Supplier { Id = Guid.NewGuid(), Name = "مصفاة الأسنان", ContactPerson = "محمد الحداد", Phone = "+967-2-567890", Email = "orders@dentalrefinery.com", Address = "عدن - المعلا", Balance = 30000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedSupplierBillsAsync()
    {
        if (await _context.SupplierBills.AnyAsync()) return;
        var supplier1 = await _context.Suppliers.FirstOrDefaultAsync(s => s.Balance > 0);
        if (supplier1 == null) return;

        _context.SupplierBills.AddRange(
            new SupplierBill { Id = Guid.NewGuid(), BillNumber = "BIL-00001", SupplierId = supplier1.Id, TotalAmount = 150000, PaidAmount = 75000, Status = BillStatus.PartiallyPaid, DueDate = DateTime.UtcNow.AddDays(15), Notes = "مستلزمات تقويم", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new SupplierBill { Id = Guid.NewGuid(), BillNumber = "BIL-00002", SupplierId = supplier1.Id, TotalAmount = 80000, PaidAmount = 0, Status = BillStatus.Unpaid, DueDate = DateTime.UtcNow.AddDays(30), Notes = "مواد حشو", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new SupplierBill { Id = Guid.NewGuid(), BillNumber = "BIL-00003", SupplierId = supplier1.Id, TotalAmount = 50000, PaidAmount = 50000, Status = BillStatus.FullyPaid, Notes = "أدوات جراحة", IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-30), UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedSupplierBillPaymentsAsync()
    {
        if (await _context.SupplierBillPayments.AnyAsync()) return;
        var paidBill = await _context.SupplierBills.FirstOrDefaultAsync(b => b.Status == BillStatus.FullyPaid);
        var partialBill = await _context.SupplierBills.FirstOrDefaultAsync(b => b.Status == BillStatus.PartiallyPaid);

        if (paidBill != null)
        {
            _context.SupplierBillPayments.Add(new SupplierBillPayment
            {
                Id = Guid.NewGuid(), SupplierBillId = paidBill.Id, Amount = 50000,
                PaymentMethod = PaymentMethod.BankTransfer, PaymentDate = DateTime.UtcNow.AddDays(-20),
                TreasuryId = BankAccountId, ReferenceNumber = "TRF-001", IsActive = true, CreatedAt = DateTime.UtcNow
            });
        }
        if (partialBill != null)
        {
            _context.SupplierBillPayments.Add(new SupplierBillPayment
            {
                Id = Guid.NewGuid(), SupplierBillId = partialBill.Id, Amount = 75000,
                PaymentMethod = PaymentMethod.Cash, PaymentDate = DateTime.UtcNow.AddDays(-5),
                TreasuryId = MainVaultId, IsActive = true, CreatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync();
    }

    private async Task SeedInventoryItemsAsync()
    {
        if (await _context.InventoryItems.AnyAsync()) return;
        _context.InventoryItems.AddRange(
            new InventoryItem { Id = Guid.NewGuid(), Name = "حشوة ضوئية (كبسولة)", Category = "مواد حشو", Quantity = 50, MinQuantity = 10, Unit = "كبسولة", CostPerUnit = 1500, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InventoryItem { Id = Guid.NewGuid(), Name = "أسلاك تقويم Niti", Category = "تقويم", Quantity = 20, MinQuantity = 5, Unit = "سلك", CostPerUnit = 5000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InventoryItem { Id = Guid.NewGuid(), Name = "قوالب تقويم معدنية", Category = "تقويم", Quantity = 100, MinQuantity = 20, Unit = "قالب", CostPerUnit = 800, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InventoryItem { Id = Guid.NewGuid(), Name = "إسمنت أسنان", Category = "مواد لاصقة", Quantity = 15, MinQuantity = 5, Unit = "علبة", CostPerUnit = 3000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InventoryItem { Id = Guid.NewGuid(), Name = "تاج خزفي (وحدة)", Category = "تركيبات", Quantity = 8, MinQuantity = 3, Unit = "تاج", CostPerUnit = 12000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InventoryItem { Id = Guid.NewGuid(), Name = "زجاجة تخدير موضعي", Category = "أدوية", Quantity = 30, MinQuantity = 10, Unit = "زجاجة", CostPerUnit = 1000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InventoryItem { Id = Guid.NewGuid(), Name = "إبرة تخدير 27G", Category = "أدوات", Quantity = 100, MinQuantity = 20, Unit = "إبرة", CostPerUnit = 200, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InventoryItem { Id = Guid.NewGuid(), Name = "أقراص تلميع", Category = "مواد تنظيف", Quantity = 3, MinQuantity = 10, Unit = "قرص", CostPerUnit = 500, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InventoryItem { Id = Guid.NewGuid(), Name = "جهاز زراعة (فيتنر)", Category = "زراعة", Quantity = 5, MinQuantity = 2, Unit = "وحدة", CostPerUnit = 50000, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new InventoryItem { Id = Guid.NewGuid(), Name = "قفازات طبية", Category = "مستهلكات", Quantity = 200, MinQuantity = 50, Unit = "زوج", CostPerUnit = 100, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedDoctorWeeklySchedulesAsync()
    {
        if (await _context.DoctorWeeklySchedules.AnyAsync()) return;
        var doctors = new[] { DrAqlanId, DrKhaledId, DrSaraId };

        foreach (var doctorId in doctors)
        {
            // Sat-Wed: 9am-5pm, Thu: 9am-1pm
            for (int day = 0; day <= 5; day++)
            {
                var endTime = day == 5 ? new TimeOnly(13, 0) : new TimeOnly(17, 0);
                _context.DoctorWeeklySchedules.Add(new DoctorWeeklySchedule
                {
                    Id = Guid.NewGuid(), DoctorId = doctorId, DayOfWeek = day,
                    StartTime = new TimeOnly(9, 0), EndTime = endTime,
                    BreakStartTime = new TimeOnly(12, 0), BreakEndTime = new TimeOnly(13, 0),
                    DefaultAppointmentDurationMinutes = 30, IsAvailableForBooking = true, IsActive = true
                });
            }
        }
        await _context.SaveChangesAsync();
    }

    private async Task SeedOperationalExpensesAsync()
    {
        if (await _context.OperationalExpenses.AnyAsync()) return;
        var adminUser = await _userManager.FindByEmailAsync("admin@aqlandental.dev");

        _context.OperationalExpenses.AddRange(
            new OperationalExpense { Id = Guid.NewGuid(), ExpenseNumber = "EXP-00001", Category = ExpenseCategory.Rent, Amount = 200000, PaymentMethod = PaymentMethod.BankTransfer, ApprovalStatus = ExpenseApprovalStatus.Approved, ApprovedBy = adminUser!.Id, ApprovedAt = DateTime.UtcNow.AddDays(-25), IsPostedToLedger = true, TreasuryId = BankAccountId, Notes = "إيجار الفرع الرئيسي - يونيو", IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-25), UpdatedAt = DateTime.UtcNow },
            new OperationalExpense { Id = Guid.NewGuid(), ExpenseNumber = "EXP-00002", Category = ExpenseCategory.Utilities, Amount = 35000, PaymentMethod = PaymentMethod.Cash, ApprovalStatus = ExpenseApprovalStatus.Approved, ApprovedBy = adminUser.Id, ApprovedAt = DateTime.UtcNow.AddDays(-20), IsPostedToLedger = true, TreasuryId = MainVaultId, Notes = "فاتورة كهرباء", IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-20), UpdatedAt = DateTime.UtcNow },
            new OperationalExpense { Id = Guid.NewGuid(), ExpenseNumber = "EXP-00003", Category = ExpenseCategory.ClinicSupplies, Amount = 50000, PaymentMethod = PaymentMethod.Cash, ApprovalStatus = ExpenseApprovalStatus.Pending, TreasuryId = MainVaultId, Notes = "مستلزمات عيادة متنوعة", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new OperationalExpense { Id = Guid.NewGuid(), ExpenseNumber = "EXP-00004", Category = ExpenseCategory.Marketing, Amount = 25000, PaymentMethod = PaymentMethod.Cash, ApprovalStatus = ExpenseApprovalStatus.Pending, Notes = "إعلان وسائل التواصل", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new OperationalExpense { Id = Guid.NewGuid(), ExpenseNumber = "EXP-00005", Category = ExpenseCategory.Maintenance, Amount = 15000, PaymentMethod = PaymentMethod.Cash, ApprovalStatus = ExpenseApprovalStatus.Rejected, RejectionReason = "تم رفض الطلب - تجاوز الميزانية", TreasuryId = MainVaultId, Notes = "صيانة جهاز أشعة", IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-10), UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedLabOrdersAsync()
    {
        if (await _context.LabOrders.AnyAsync()) return;
        _context.LabOrders.AddRange(
            new LabOrder { Id = Guid.NewGuid(), PatientId = P3, OrderNumber = "LAB-00001", ApplianceType = "تاج خزفي", LabName = "مختبر الأسنان المتقدم", SentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7)), ExpectedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)), Status = LabOrderStatus.Manufacturing, Priority = LabOrderPriority.Normal, Cost = 15000, DoctorId = DrAqlanId, Notes = "تاج للضرس 36", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LabOrder { Id = Guid.NewGuid(), PatientId = P7, OrderNumber = "LAB-00002", ApplianceType = "دعامة زراعة", LabName = "مختبر الأسنان المتقدم", SentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-14)), ExpectedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)), Status = LabOrderStatus.Ready, Priority = LabOrderPriority.Urgent, Cost = 25000, DoctorId = DrKhaledId, Notes = "دعامة زراعة للضرس 46", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LabOrder { Id = Guid.NewGuid(), PatientId = P4, OrderNumber = "LAB-00003", ApplianceType = "جهاز تقويم", LabName = "مختبر الابتسامة", SentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3)), Status = LabOrderStatus.Sent, Priority = LabOrderPriority.Normal, Cost = 10000, DoctorId = DrAqlanId, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LabOrder { Id = Guid.NewGuid(), PatientId = P6, OrderNumber = "LAB-00004", ApplianceType = "فينير", LabName = "مختبر الأسنان المتقدم", SentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)), ExpectedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)), Status = LabOrderStatus.Received, Priority = LabOrderPriority.Normal, Cost = 20000, DoctorId = DrSaraId, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LabOrder { Id = Guid.NewGuid(), PatientId = P15, OrderNumber = "LAB-00005", ApplianceType = "دعامة زراعة", LabName = "مختبر الأسنان المتقدم", SentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-90)), Status = LabOrderStatus.Received, Priority = LabOrderPriority.Normal, Cost = 25000, DoctorId = DrKhaledId, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedNotificationsAsync()
    {
        if (await _context.Notifications.AnyAsync()) return;
        var adminUser = await _userManager.FindByEmailAsync("admin@aqlandental.dev");
        var receptionUser = await _userManager.FindByEmailAsync("reception@aqlandental.dev");

        _context.Notifications.AddRange(
            new Notification { Id = Guid.NewGuid(), UserId = adminUser!.Id, Type = NotificationType.Payment, Title = "دفعة جديدة", Message = "تم استلام دفعة بقيمة 20,000 ر.ي من فاطمة علي السقاف", IsRead = false, CreatedAt = DateTime.UtcNow.AddHours(-2) },
            new Notification { Id = Guid.NewGuid(), UserId = adminUser.Id, Type = NotificationType.Appointment, Title = "موعد جديد", Message = "تم حجز موعد جديد لأحمد محمد العمري مع د. خالد", IsRead = false, CreatedAt = DateTime.UtcNow.AddHours(-1) },
            new Notification { Id = Guid.NewGuid(), UserId = adminUser.Id, Type = NotificationType.System, Title = "مصروف بانتظار الاعتماد", Message = "مصروف مستلزمات عيادة بقيمة 50,000 ر.ي بانتظار اعتمادك", Link = "/dashboard/expenses", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-30) },
            new Notification { Id = Guid.NewGuid(), UserId = adminUser.Id, Type = NotificationType.LabOrder, Title = "طلب مختبر جاهز", Message = "طلب المختبر LAB-00002 جاهز للاستلام", Link = "/dashboard/lab", IsRead = true, ReadAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow.AddDays(-1) },
            new Notification { Id = Guid.NewGuid(), UserId = receptionUser!.Id, Type = NotificationType.Queue, Title = "مريض في الطابور", Message = "المريض خالد يحيى الشميري وصل وتم إضافته للطابور", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-15) }
        );
        await _context.SaveChangesAsync();
    }

    private async Task SeedSettingsAsync()
    {
        if (await _context.Settings.AnyAsync()) return;
        _context.Settings.AddRange(
            new Setting { Id = Guid.NewGuid(), Key = "Clinic.WorkingHours.Start", Value = "09:00", Category = "Clinic", UpdatedAt = DateTime.UtcNow },
            new Setting { Id = Guid.NewGuid(), Key = "Clinic.WorkingHours.End", Value = "17:00", Category = "Clinic", UpdatedAt = DateTime.UtcNow },
            new Setting { Id = Guid.NewGuid(), Key = "Clinic.WorkingDays", Value = "0,1,2,3,4,5", Category = "Clinic", UpdatedAt = DateTime.UtcNow },
            new Setting { Id = Guid.NewGuid(), Key = "Finance.DefaultCommissionPercentage", Value = "20", Category = "Finance", UpdatedAt = DateTime.UtcNow },
            new Setting { Id = Guid.NewGuid(), Key = "Finance.Currency", Value = "YER", Category = "Finance", UpdatedAt = DateTime.UtcNow },
            new Setting { Id = Guid.NewGuid(), Key = "Appointment.DefaultDuration", Value = "30", Category = "Appointment", UpdatedAt = DateTime.UtcNow },
            new Setting { Id = Guid.NewGuid(), Key = "Appointment.ReminderHours", Value = "2", Category = "Appointment", UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();
    }
}
