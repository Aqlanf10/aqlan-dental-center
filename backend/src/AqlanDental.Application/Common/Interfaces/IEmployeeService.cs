using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── Employee DTOs ─────────────────────────────────────────────────

public record EmployeeDto(
    Guid Id,
    string FullName,
    string? Phone,
    string? Position,
    DateOnly? HireDate,
    decimal? BaseSalary,
    string? EmergencyContact,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateEmployeeRequest(
    string FullName,
    string? Phone,
    string? Position,
    DateOnly? HireDate,
    decimal? BaseSalary,
    string? EmergencyContact,
    string? Notes
);

public record UpdateEmployeeRequest(
    string? FullName,
    string? Phone,
    string? Position,
    DateOnly? HireDate,
    decimal? BaseSalary,
    string? EmergencyContact,
    string? Notes
);

// ─── Interface ──────────────────────────────────────────────────────

public interface IEmployeeService
{
    Task<PagedResult<EmployeeDto>> GetEmployeesAsync(string? position, bool? activeOnly, int page, int pageSize);
    Task<EmployeeDto?> GetEmployeeByIdAsync(Guid id);
    Task<EmployeeDto> CreateEmployeeAsync(CreateEmployeeRequest request, string userId);
    Task<EmployeeDto?> UpdateEmployeeAsync(Guid id, UpdateEmployeeRequest request, string userId);
}
