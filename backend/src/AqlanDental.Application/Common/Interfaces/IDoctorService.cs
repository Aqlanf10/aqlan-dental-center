using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

public record DoctorDto(
    Guid Id,
    string FullName,
    string Specialty,
    string? PhoneNumber,
    string? Email,
    string? Color,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateDoctorRequest(
    string FullName,
    string Specialty,
    string? PhoneNumber,
    string? Email,
    string? Color
);

public record UpdateDoctorRequest(
    string FullName,
    string Specialty,
    string? PhoneNumber,
    string? Email,
    string? Color
);

public interface IDoctorService
{
    Task<PagedResult<DoctorDto>> GetDoctorsAsync(int page, int pageSize, string? search);
    Task<DoctorDto?> GetDoctorByIdAsync(Guid id);
    Task<DoctorDto> CreateDoctorAsync(CreateDoctorRequest request, string userId);
    Task<DoctorDto?> UpdateDoctorAsync(Guid id, UpdateDoctorRequest request, string userId);
    Task<bool> SoftDeleteDoctorAsync(Guid id);
}
