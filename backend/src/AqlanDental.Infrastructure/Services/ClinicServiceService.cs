using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class ClinicServiceService : IClinicServiceService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly Dictionary<ServiceCategory, string> CategoryDisplayMap = new()
    {
        { ServiceCategory.Consultation, "استشارة" },
        { ServiceCategory.Preventive, "وقائي" },
        { ServiceCategory.Restorative, "ترميمي" },
        { ServiceCategory.Endodontics, "عصبي" },
        { ServiceCategory.Prosthodontics, "تعويضي" },
        { ServiceCategory.Orthodontics, "تقويم" },
        { ServiceCategory.Surgery, "جراحة" },
        { ServiceCategory.Cosmetic, "تجميلي" },
        { ServiceCategory.Radiology, "أشعة" },
        { ServiceCategory.Other, "أخرى" },
    };

    public ClinicServiceService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<ClinicServiceDto>> GetClinicServicesAsync(
        int page, int pageSize, string? search, int? category, bool includeInactive)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.ClinicServices.AsQueryable();

        if (!includeInactive)
            query = query.Where(s => s.IsActive);

        if (category.HasValue)
            query = query.Where(s => s.Category == (ServiceCategory)category.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(s =>
                s.ArabicName.ToLower().Contains(searchLower) ||
                s.EnglishName.ToLower().Contains(searchLower) ||
                s.Code.ToLower().Contains(searchLower) ||
                (s.Department != null && s.Department.ToLower().Contains(searchLower)));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(s => s.SortOrder)
                .ThenBy(s => s.ArabicName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => MapToDto(s))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<ClinicServiceDto>(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<ClinicServiceDto?> GetClinicServiceByIdAsync(Guid id)
    {
        var service = await _context.ClinicServices.FindAsync(id);
        if (service is null) return null;
        return MapToDto(service);
    }

    public async Task<ClinicServiceDto> CreateClinicServiceAsync(CreateClinicServiceRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.ArabicName))
            throw new DomainException("SERVICE_NAME_REQUIRED", "اسم الخدمة بالعربية مطلوب");

        if (string.IsNullOrWhiteSpace(request.Code))
            throw new DomainException("SERVICE_CODE_REQUIRED", "رمز الخدمة مطلوب");

        // Check unique code
        var codeExists = await _context.ClinicServices.AnyAsync(s => s.Code == request.Code);
        if (codeExists)
            throw new DomainException("SERVICE_CODE_DUPLICATE", "رمز الخدمة مستخدم بالفعل");

        var category = request.Category.HasValue
            ? (ServiceCategory)request.Category.Value
            : ServiceCategory.Other;

        ValidateCategory(category);

        var service = new ClinicService
        {
            Id = Guid.NewGuid(),
            ArabicName = request.ArabicName,
            EnglishName = request.EnglishName ?? string.Empty,
            Code = request.Code,
            Department = request.Department,
            Category = category,
            Description = request.Description,
            DefaultDurationMinutes = request.DefaultDurationMinutes ?? 30,
            DefaultPrice = request.DefaultPrice ?? 0,
            RequiresDoctor = request.RequiresDoctor ?? true,
            ShowInBooking = request.ShowInBooking ?? true,
            ShowInReception = request.ShowInReception ?? true,
            ShowInTreatmentPlan = request.ShowInTreatmentPlan ?? true,
            SortOrder = request.SortOrder ?? 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.ClinicServices.Add(service);
        await _context.SaveChangesAsync();

        return MapToDto(service);
    }

    public async Task<ClinicServiceDto?> UpdateClinicServiceAsync(Guid id, UpdateClinicServiceRequest request, string userId)
    {
        var service = await _context.ClinicServices.FindAsync(id);
        if (service is null || !service.IsActive) return null;

        if (request.ArabicName is not null)
        {
            if (string.IsNullOrWhiteSpace(request.ArabicName))
                throw new DomainException("SERVICE_NAME_REQUIRED", "اسم الخدمة بالعربية مطلوب");
            service.ArabicName = request.ArabicName;
        }

        if (request.EnglishName is not null)
            service.EnglishName = request.EnglishName;

        if (request.Code is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Code))
                throw new DomainException("SERVICE_CODE_REQUIRED", "رمز الخدمة مطلوب");

            var codeExists = await _context.ClinicServices.AnyAsync(s => s.Code == request.Code && s.Id != id);
            if (codeExists)
                throw new DomainException("SERVICE_CODE_DUPLICATE", "رمز الخدمة مستخدم بالفعل");

            service.Code = request.Code;
        }

        if (request.Department is not null)
            service.Department = request.Department;

        if (request.Category.HasValue)
        {
            var category = (ServiceCategory)request.Category.Value;
            ValidateCategory(category);
            service.Category = category;
        }

        if (request.Description is not null)
            service.Description = request.Description;

        if (request.DefaultDurationMinutes.HasValue)
            service.DefaultDurationMinutes = request.DefaultDurationMinutes.Value;

        if (request.DefaultPrice.HasValue)
            service.DefaultPrice = request.DefaultPrice.Value;

        if (request.RequiresDoctor.HasValue)
            service.RequiresDoctor = request.RequiresDoctor.Value;

        if (request.ShowInBooking.HasValue)
            service.ShowInBooking = request.ShowInBooking.Value;

        if (request.ShowInReception.HasValue)
            service.ShowInReception = request.ShowInReception.Value;

        if (request.ShowInTreatmentPlan.HasValue)
            service.ShowInTreatmentPlan = request.ShowInTreatmentPlan.Value;

        if (request.SortOrder.HasValue)
            service.SortOrder = request.SortOrder.Value;

        service.UpdatedAt = DateTime.UtcNow;
        service.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return MapToDto(service);
    }

    public async Task<bool> DeactivateClinicServiceAsync(Guid id)
    {
        var service = await _context.ClinicServices.FindAsync(id);
        if (service is null || !service.IsActive) return false;

        service.IsActive = false;
        service.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ActivateClinicServiceAsync(Guid id)
    {
        var service = await _context.ClinicServices.FindAsync(id);
        if (service is null || service.IsActive) return false;

        service.IsActive = true;
        service.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SettingDto>> GetAllSettingsAsync()
    {
        var settings = await _context.Settings
            .OrderBy(s => s.Category)
                .ThenBy(s => s.Key)
            .ToListAsync();

        return settings.Select(MapSettingToDto).ToList();
    }

    public async Task<SettingDto?> UpsertSettingAsync(string key, UpsertSettingRequest request)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new DomainException("SETTING_KEY_REQUIRED", "مفتاح الإعداد مطلوب");

        var setting = await _context.Settings.FirstOrDefaultAsync(s => s.Key == key);

        if (setting is null)
        {
            setting = new Setting
            {
                Id = Guid.NewGuid(),
                Key = key,
                Value = request.Value,
                Category = request.Category,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Settings.Add(setting);
        }
        else
        {
            if (request.Value is not null)
                setting.Value = request.Value;

            if (request.Category is not null)
                setting.Category = request.Category;

            setting.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return MapSettingToDto(setting);
    }

    private static void ValidateCategory(ServiceCategory category)
    {
        if (!CategoryDisplayMap.ContainsKey(category))
            throw new DomainException("INVALID_CATEGORY", "فئة الخدمة غير صالحة");
    }

    private static ClinicServiceDto MapToDto(ClinicService s) => new(
        s.Id,
        s.ArabicName,
        s.EnglishName,
        s.Code,
        s.Department,
        (int)s.Category,
        CategoryDisplayMap.GetValueOrDefault(s.Category, "أخرى"),
        s.Description,
        s.DefaultDurationMinutes,
        s.DefaultPrice,
        s.RequiresDoctor,
        s.ShowInBooking,
        s.ShowInReception,
        s.ShowInTreatmentPlan,
        s.SortOrder,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    );

    private static SettingDto MapSettingToDto(Setting s) => new(
        s.Id,
        s.Key,
        s.Value,
        s.Category,
        s.UpdatedAt
    );
}
