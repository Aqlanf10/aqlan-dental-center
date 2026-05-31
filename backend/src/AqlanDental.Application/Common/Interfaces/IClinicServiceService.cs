using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

public record ClinicServiceDto(
    Guid Id,
    string ArabicName,
    string EnglishName,
    string Code,
    string? Department,
    int Category,
    string CategoryDisplay,
    string? Description,
    int DefaultDurationMinutes,
    decimal DefaultPrice,
    bool RequiresDoctor,
    bool ShowInBooking,
    bool ShowInReception,
    bool ShowInTreatmentPlan,
    int SortOrder,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateClinicServiceRequest(
    string ArabicName,
    string? EnglishName,
    string Code,
    string? Department,
    int? Category,
    string? Description,
    int? DefaultDurationMinutes,
    decimal? DefaultPrice,
    bool? RequiresDoctor,
    bool? ShowInBooking,
    bool? ShowInReception,
    bool? ShowInTreatmentPlan,
    int? SortOrder
);

public record UpdateClinicServiceRequest(
    string? ArabicName,
    string? EnglishName,
    string? Code,
    string? Department,
    int? Category,
    string? Description,
    int? DefaultDurationMinutes,
    decimal? DefaultPrice,
    bool? RequiresDoctor,
    bool? ShowInBooking,
    bool? ShowInReception,
    bool? ShowInTreatmentPlan,
    int? SortOrder
);

public record SettingDto(
    Guid Id,
    string Key,
    string? Value,
    string? Category,
    DateTime UpdatedAt
);

public record UpsertSettingRequest(
    string? Value,
    string? Category
);

public interface IClinicServiceService
{
    // Clinic Services
    Task<PagedResult<ClinicServiceDto>> GetClinicServicesAsync(int page, int pageSize, string? search, int? category, bool includeInactive);
    Task<ClinicServiceDto?> GetClinicServiceByIdAsync(Guid id);
    Task<ClinicServiceDto> CreateClinicServiceAsync(CreateClinicServiceRequest request, string userId);
    Task<ClinicServiceDto?> UpdateClinicServiceAsync(Guid id, UpdateClinicServiceRequest request, string userId);
    Task<bool> DeactivateClinicServiceAsync(Guid id);
    Task<bool> ActivateClinicServiceAsync(Guid id);

    // Settings
    Task<List<SettingDto>> GetAllSettingsAsync();
    Task<SettingDto?> UpsertSettingAsync(string key, UpsertSettingRequest request);
}
