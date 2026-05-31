using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── LabOrder DTOs ─────────────────────────────────────────────────

public record LabOrderDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid? OrthoCaseId,
    string? OrderNumber,
    string? ApplianceType,
    string? LabName,
    DateOnly? SentDate,
    DateOnly? ExpectedDate,
    DateOnly? ReceivedDate,
    int Status,
    string StatusDisplay,
    int Priority,
    string PriorityDisplay,
    string? Instructions,
    decimal? Cost,
    Guid? DoctorId,
    string? DoctorName,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateLabOrderRequest(
    Guid PatientId,
    Guid? OrthoCaseId,
    string? ApplianceType,
    string? LabName,
    DateOnly? SentDate,
    DateOnly? ExpectedDate,
    int Priority = 1,
    string? Instructions = null,
    decimal? Cost = null,
    Guid? DoctorId = null,
    string? Notes = null
);

public record UpdateLabOrderRequest(
    string? ApplianceType,
    string? LabName,
    DateOnly? SentDate,
    DateOnly? ExpectedDate,
    DateOnly? ReceivedDate,
    int? Status,
    int? Priority,
    string? Instructions,
    decimal? Cost,
    Guid? DoctorId,
    string? Notes
);

// ─── Interface ──────────────────────────────────────────────────────

public interface ILabOrderService
{
    Task<PagedResult<LabOrderDto>> GetLabOrdersAsync(Guid? patientId, int? status, int page, int pageSize);
    Task<LabOrderDto?> GetLabOrderByIdAsync(Guid id);
    Task<LabOrderDto> CreateLabOrderAsync(CreateLabOrderRequest request, string userId);
    Task<LabOrderDto?> UpdateLabOrderAsync(Guid id, UpdateLabOrderRequest request, string userId);
}
