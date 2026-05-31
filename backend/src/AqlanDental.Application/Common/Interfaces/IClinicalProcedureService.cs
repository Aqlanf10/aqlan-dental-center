namespace AqlanDental.Application.Common.Interfaces;

public record ClinicalProcedureDto(
    Guid Id,
    Guid ClinicalVisitId,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid DoctorId,
    string? DoctorName,
    int ProcedureType,
    string ProcedureTypeDisplay,
    string? ToothNumber,
    string? ToothSurface,
    string Title,
    string? Description,
    string? ClinicalNotes,
    int Status,
    string StatusDisplay,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateClinicalProcedureRequest(
    int ProcedureType,
    string? ToothNumber,
    string? ToothSurface,
    string Title,
    string? Description,
    string? ClinicalNotes,
    int? Status
);

public record UpdateClinicalProcedureRequest(
    int? ProcedureType,
    string? ToothNumber,
    string? ToothSurface,
    string? Title,
    string? Description,
    string? ClinicalNotes,
    int? Status
);

public record UpdateClinicalProcedureStatusRequest(
    int Status
);

public interface IClinicalProcedureService
{
    Task<List<ClinicalProcedureDto>> GetProceduresByClinicalVisitAsync(Guid clinicalVisitId);
    Task<ClinicalProcedureDto?> GetProcedureByIdAsync(Guid id);
    Task<ClinicalProcedureDto> CreateProcedureAsync(Guid clinicalVisitId, CreateClinicalProcedureRequest request, string userId);
    Task<ClinicalProcedureDto?> UpdateProcedureAsync(Guid procedureId, UpdateClinicalProcedureRequest request, string userId);
    Task<ClinicalProcedureDto?> UpdateProcedureStatusAsync(Guid procedureId, UpdateClinicalProcedureStatusRequest request, string userId);
    Task<bool> DeleteProcedureAsync(Guid procedureId, string userId);
}
