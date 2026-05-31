using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── OrthoCase DTOs ─────────────────────────────────────────────────

public record OrthoCaseDto(
    Guid Id,
    string CaseNumber,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid? DoctorId,
    string? DoctorName,
    string? ApplianceType,
    DateOnly? StartDate,
    int? ExpectedDurationMonths,
    string? CurrentStage,
    int StagePercentage,
    int Status,
    string StatusDisplay,
    decimal? TotalFee,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<OrthoVisitDto>? Visits,
    List<TreatmentStageDto>? Stages
);

public record OrthoCaseListItemDto(
    Guid Id,
    string CaseNumber,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid? DoctorId,
    string? DoctorName,
    string? ApplianceType,
    DateOnly? StartDate,
    int StagePercentage,
    int Status,
    string StatusDisplay,
    decimal? TotalFee,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateOrthoCaseRequest(
    Guid PatientId,
    Guid? DoctorId,
    string? ApplianceType,
    DateOnly? StartDate,
    int? ExpectedDurationMonths,
    string? CurrentStage,
    int StagePercentage = 0,
    int Status = 0,
    decimal? TotalFee = null,
    string? Notes = null
);

public record UpdateOrthoCaseRequest(
    Guid? DoctorId,
    string? ApplianceType,
    DateOnly? StartDate,
    int? ExpectedDurationMonths,
    string? CurrentStage,
    int? StagePercentage,
    int? Status,
    decimal? TotalFee,
    string? Notes
);

// ─── OrthoVisit DTOs ────────────────────────────────────────────────

public record OrthoVisitDto(
    Guid Id,
    Guid OrthoCaseId,
    int VisitNumber,
    DateOnly VisitDate,
    string? VisitType,
    string? CurrentStage,
    string? WireUpper,
    string? WireLower,
    string? ElasticsType,
    string? ClinicalNotes,
    string? PatientInstructions,
    DateOnly? NextAppointmentDate,
    Guid? DoctorId,
    string? DoctorName,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record AddOrthoVisitRequest(
    int? VisitNumber,
    DateOnly? VisitDate,
    string? VisitType,
    string? CurrentStage,
    string? WireUpper,
    string? WireLower,
    string? ElasticsType,
    string? ClinicalNotes,
    string? PatientInstructions,
    DateOnly? NextAppointmentDate,
    Guid? DoctorId
);

// ─── TreatmentStage DTOs ────────────────────────────────────────────

public record TreatmentStageDto(
    Guid Id,
    Guid OrthoCaseId,
    string StageName,
    int StageOrder,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    int? TargetDurationMonths,
    string? Notes,
    int Status,
    string StatusDisplay,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record UpdateTreatmentStageRequest(
    string? StageName,
    int? StageOrder,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    int? TargetDurationMonths,
    string? Notes,
    int? Status
);

// ─── Interface ──────────────────────────────────────────────────────

public interface IOrthodonticsService
{
    Task<PagedResult<OrthoCaseListItemDto>> GetOrthoCasesAsync(Guid? patientId, int? status, int page, int pageSize);
    Task<OrthoCaseDto?> GetOrthoCaseByIdAsync(Guid id);
    Task<OrthoCaseDto> CreateOrthoCaseAsync(CreateOrthoCaseRequest request, string userId);
    Task<OrthoCaseDto?> UpdateOrthoCaseAsync(Guid id, UpdateOrthoCaseRequest request, string userId);
    Task<OrthoVisitDto> AddOrthoVisitAsync(Guid caseId, AddOrthoVisitRequest request, string userId);
    Task<TreatmentStageDto?> UpdateTreatmentStageAsync(Guid stageId, UpdateTreatmentStageRequest request, string userId);
}
