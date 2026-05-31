using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── SurgeryCase DTOs ───────────────────────────────────────────────

public record SurgeryCaseDto(
    Guid Id,
    string CaseNumber,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid? DoctorId,
    string? DoctorName,
    string SurgeryType,
    string? TeethInvolved,
    int Status,
    string StatusDisplay,
    DateOnly? SurgeryDate,
    string? SurgeryLocation,
    string? AnesthesiaType,
    string? PreopNotes,
    string? OperativeNotes,
    string? PostopInstructions,
    string? Complications,
    DateOnly? FollowupDate,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record SurgeryCaseListItemDto(
    Guid Id,
    string CaseNumber,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid? DoctorId,
    string? DoctorName,
    string SurgeryType,
    string? TeethInvolved,
    int Status,
    string StatusDisplay,
    DateOnly? SurgeryDate,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateSurgeryCaseRequest(
    Guid PatientId,
    Guid? DoctorId,
    string SurgeryType,
    string? TeethInvolved,
    int Status = 0,
    DateOnly? SurgeryDate = null,
    string? SurgeryLocation = null,
    string? AnesthesiaType = null,
    string? PreopNotes = null,
    string? OperativeNotes = null,
    string? PostopInstructions = null,
    string? Complications = null,
    DateOnly? FollowupDate = null,
    string? Notes = null
);

public record UpdateSurgeryCaseRequest(
    Guid? DoctorId,
    string? SurgeryType,
    string? TeethInvolved,
    DateOnly? SurgeryDate,
    string? SurgeryLocation,
    string? AnesthesiaType,
    string? PreopNotes,
    string? OperativeNotes,
    string? PostopInstructions,
    string? Complications,
    DateOnly? FollowupDate,
    string? Notes
);

public record UpdateSurgeryStatusRequest(
    int Status
);

// ─── Interface ──────────────────────────────────────────────────────

public interface ISurgeryService
{
    Task<PagedResult<SurgeryCaseListItemDto>> GetSurgeryCasesAsync(Guid? patientId, int? status, int page, int pageSize);
    Task<SurgeryCaseDto?> GetSurgeryCaseByIdAsync(Guid id);
    Task<SurgeryCaseDto> CreateSurgeryCaseAsync(CreateSurgeryCaseRequest request, string userId);
    Task<SurgeryCaseDto?> UpdateSurgeryCaseAsync(Guid id, UpdateSurgeryCaseRequest request, string userId);
    Task<SurgeryCaseDto?> UpdateSurgeryStatusAsync(Guid id, UpdateSurgeryStatusRequest request, string userId);
}
