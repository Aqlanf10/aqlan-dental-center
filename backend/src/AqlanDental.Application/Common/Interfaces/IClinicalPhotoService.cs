using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── ClinicalPhoto DTOs ────────────────────────────────────────────

public record ClinicalPhotoDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    Guid? OrthoCaseId,
    string FileUrl,
    string? ThumbnailUrl,
    int Category,
    string CategoryDisplay,
    string? PhotoType,
    string? Stage,
    DateTime? PhotoDate,
    string? Caption,
    bool IsActive,
    DateTime CreatedAt
);

public record UploadClinicalPhotoRequest(
    Guid PatientId,
    Guid? OrthoCaseId,
    string FileUrl,
    string? ThumbnailUrl,
    int Category,
    string? PhotoType = null,
    string? Stage = null,
    DateTime? PhotoDate = null,
    string? Caption = null
);

// ─── Radiograph DTOs ───────────────────────────────────────────────

public record RadiographDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string FileUrl,
    int XrayType,
    string XrayTypeDisplay,
    string? FileName,
    long? FileSize,
    string? MimeType,
    string? ToothRelated,
    Guid? DoctorId,
    string? DoctorName,
    DateTime? XrayDate,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt
);

public record UploadRadiographRequest(
    Guid PatientId,
    string FileUrl,
    int XrayType,
    string? FileName = null,
    long? FileSize = null,
    string? MimeType = null,
    string? ToothRelated = null,
    Guid? DoctorId = null,
    DateTime? XrayDate = null,
    string? Notes = null
);

// ─── PatientDocument DTOs ──────────────────────────────────────────

public record PatientDocumentDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string Title,
    int DocumentType,
    string DocumentTypeDisplay,
    string FileUrl,
    string? FileName,
    long? FileSize,
    string? MimeType,
    bool IsSigned,
    DateTime? SignedAt,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt
);

public record UploadPatientDocumentRequest(
    Guid PatientId,
    string Title,
    int DocumentType,
    string FileUrl,
    string? FileName = null,
    long? FileSize = null,
    string? MimeType = null,
    bool IsSigned = false,
    string? Notes = null
);

// ─── Interface ─────────────────────────────────────────────────────

public interface IClinicalPhotoService
{
    // Clinical Photos
    Task<ClinicalPhotoDto> UploadPhotoAsync(UploadClinicalPhotoRequest request);
    Task<PagedResult<ClinicalPhotoDto>> GetPhotosByPatientAsync(Guid patientId, int page, int pageSize, int? category);
    Task<bool> DeletePhotoAsync(Guid id);

    // Radiographs
    Task<RadiographDto> UploadRadiographAsync(UploadRadiographRequest request);
    Task<PagedResult<RadiographDto>> GetRadiographsByPatientAsync(Guid patientId, int page, int pageSize, int? xrayType);
    Task<bool> DeleteRadiographAsync(Guid id);

    // Patient Documents
    Task<PatientDocumentDto> UploadDocumentAsync(UploadPatientDocumentRequest request);
    Task<PagedResult<PatientDocumentDto>> GetDocumentsByPatientAsync(Guid patientId, int page, int pageSize, int? documentType);
    Task<bool> DeleteDocumentAsync(Guid id);
    Task<PatientDocumentDto?> SignDocumentAsync(Guid id);
}
