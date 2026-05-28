using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

public record PatientDto(
    Guid Id,
    string PatientNumber,
    string FullName,
    int Gender,
    string GenderDisplay,
    DateOnly? DateOfBirth,
    string PhoneNumber,
    string? WhatsAppNumber,
    string? Address,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePatientRequest(
    string FullName,
    int Gender,
    DateOnly? DateOfBirth,
    string PhoneNumber,
    string? WhatsAppNumber,
    string? Address,
    string? Notes
);

public record UpdatePatientRequest(
    string FullName,
    int Gender,
    DateOnly? DateOfBirth,
    string PhoneNumber,
    string? WhatsAppNumber,
    string? Address,
    string? Notes
);

public interface IPatientService
{
    Task<PagedResult<PatientDto>> GetPatientsAsync(int page, int pageSize, string? search);
    Task<PatientDto?> GetPatientByIdAsync(Guid id);
    Task<PatientDto> CreatePatientAsync(CreatePatientRequest request, string userId);
    Task<PatientDto?> UpdatePatientAsync(Guid id, UpdatePatientRequest request, string userId);
    Task<bool> SoftDeletePatientAsync(Guid id);
}
