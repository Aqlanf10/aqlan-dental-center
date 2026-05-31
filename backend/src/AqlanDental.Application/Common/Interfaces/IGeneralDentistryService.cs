using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── Dental Chart DTOs ────────────────────────────────────────────────

public record ToothConditionDto(
    Guid Id,
    int ToothNumber,
    int Condition,
    string ConditionDisplay,
    string? SurfacesAffected,
    string? Notes,
    string? TreatmentDone,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record DentalChartDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    DateOnly ChartDate,
    Guid? DoctorId,
    string? DoctorName,
    bool IsActive,
    List<ToothConditionDto> ToothConditions,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record UpsertDentalChartRequest(
    Guid? DoctorId,
    List<UpsertToothConditionRequest>? ToothConditions
);

public record UpsertToothConditionRequest(
    int ToothNumber,
    int Condition,
    string? SurfacesAffected,
    string? Notes,
    string? TreatmentDone
);

public record UpdateToothConditionRequest(
    int? Condition,
    string? SurfacesAffected,
    string? Notes,
    string? TreatmentDone
);

// ─── General Treatment DTOs ──────────────────────────────────────────

public record GeneralTreatmentDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid? VisitId,
    int TreatmentType,
    string TreatmentTypeDisplay,
    int? ToothNumber,
    string? MaterialUsed,
    string? AnesthesiaType,
    decimal? Cost,
    Guid? DoctorId,
    string? DoctorName,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateGeneralTreatmentRequest(
    Guid PatientId,
    Guid? VisitId,
    int TreatmentType,
    int? ToothNumber,
    string? MaterialUsed,
    string? AnesthesiaType,
    decimal? Cost,
    Guid? DoctorId,
    string? Notes
);

// ─── Treatment Plan DTOs ─────────────────────────────────────────────

public record TreatmentPlanStepDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    int SequenceNumber,
    Guid? ClinicServiceId,
    string? ServiceNameSnapshot,
    string? Department,
    int? ToothNumber,
    string? ToothArea,
    string Title,
    string? Description,
    int Priority,
    string PriorityDisplay,
    int Status,
    string StatusDisplay,
    Guid? ResponsibleDoctorId,
    string? ResponsibleDoctorName,
    DateOnly? PlannedDate,
    DateOnly? CompletedDate,
    decimal? EstimatedCost,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record AddTreatmentPlanStepRequest(
    Guid PatientId,
    int? SequenceNumber,
    Guid? ClinicServiceId,
    string? ServiceNameSnapshot,
    string? Department,
    int? ToothNumber,
    string? ToothArea,
    string Title,
    string? Description,
    int Priority = 1,
    int Status = 0,
    Guid? ResponsibleDoctorId = null,
    DateOnly? PlannedDate = null,
    decimal? EstimatedCost = null,
    string? Notes = null
);

public record UpdateTreatmentPlanStepRequest(
    int? SequenceNumber,
    Guid? ClinicServiceId,
    string? ServiceNameSnapshot,
    string? Department,
    int? ToothNumber,
    string? ToothArea,
    string? Title,
    string? Description,
    int? Priority,
    int? Status,
    Guid? ResponsibleDoctorId,
    DateOnly? PlannedDate,
    decimal? EstimatedCost,
    string? Notes
);

public record UpdateTreatmentStepStatusRequest(
    int Status
);

// ─── Interface ───────────────────────────────────────────────────────

public interface IGeneralDentistryService
{
    // Dental Chart
    Task<DentalChartDto?> GetDentalChartAsync(Guid patientId);
    Task<DentalChartDto> UpsertDentalChartAsync(Guid patientId, UpsertDentalChartRequest request, string userId);
    Task<ToothConditionDto?> UpdateToothConditionAsync(Guid chartId, int toothNumber, UpdateToothConditionRequest request, string userId);

    // General Treatments
    Task<PagedResult<GeneralTreatmentDto>> GetGeneralTreatmentsAsync(Guid patientId, int page, int pageSize);
    Task<GeneralTreatmentDto> CreateGeneralTreatmentAsync(CreateGeneralTreatmentRequest request, string userId);

    // Treatment Plan
    Task<List<TreatmentPlanStepDto>> GetTreatmentPlanAsync(Guid patientId);
    Task<TreatmentPlanStepDto> AddTreatmentPlanStepAsync(AddTreatmentPlanStepRequest request, string userId);
    Task<TreatmentPlanStepDto?> UpdateTreatmentPlanStepAsync(Guid stepId, UpdateTreatmentPlanStepRequest request, string userId);
    Task<TreatmentPlanStepDto?> UpdateTreatmentStepStatusAsync(Guid stepId, UpdateTreatmentStepStatusRequest request, string userId);
}
