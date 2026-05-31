namespace AqlanDental.Application.Common.Interfaces;

public record PrescriptionDto(
    Guid Id,
    Guid ClinicalVisitId,
    Guid PatientId,
    Guid DoctorId,
    string MedicationName,
    string? Dosage,
    string? Frequency,
    string? Duration,
    string? Instructions,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record ClinicalVisitDto(
    Guid Id,
    Guid DailyVisitId,
    Guid? ClinicQueueItemId,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid DoctorId,
    string? DoctorName,
    DateOnly VisitDate,
    DateTime StartedAt,
    DateTime? CompletedAt,
    int Status,
    string StatusDisplay,
    string? ChiefComplaint,
    string? ClinicalFindings,
    string? Diagnosis,
    string? TreatmentNotes,
    string? DoctorRecommendations,
    bool NextVisitRecommended,
    DateOnly? NextVisitDate,
    List<PrescriptionDto> Prescriptions,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record TodayClinicalVisitsDto(
    DateOnly Date,
    int TotalCount,
    int OpenCount,
    int InProgressCount,
    int CompletedCount,
    int CancelledCount,
    List<ClinicalVisitDto> Visits
);

public record StartClinicalVisitRequest(
    string? ChiefComplaint
);

public record UpdateClinicalVisitRequest(
    string? ChiefComplaint,
    string? ClinicalFindings,
    string? Diagnosis,
    string? TreatmentNotes,
    string? DoctorRecommendations,
    bool? NextVisitRecommended,
    DateOnly? NextVisitDate
);

public record CompleteClinicalVisitRequest(
    string? Diagnosis,
    string? TreatmentNotes,
    string? DoctorRecommendations,
    bool? NextVisitRecommended,
    DateOnly? NextVisitDate
);

public record AddPrescriptionRequest(
    string MedicationName,
    string? Dosage,
    string? Frequency,
    string? Duration,
    string? Instructions
);

public record UpdatePrescriptionRequest(
    string MedicationName,
    string? Dosage,
    string? Frequency,
    string? Duration,
    string? Instructions
);

public interface IClinicalVisitService
{
    Task<TodayClinicalVisitsDto> GetTodayClinicalVisitsAsync(DateOnly? date);
    Task<ClinicalVisitDto?> GetClinicalVisitByIdAsync(Guid id);
    Task<ClinicalVisitDto?> GetClinicalVisitByDailyVisitIdAsync(Guid dailyVisitId);
    Task<ClinicalVisitDto> StartClinicalVisitAsync(Guid dailyVisitId, StartClinicalVisitRequest request, string userId);
    Task<ClinicalVisitDto?> UpdateClinicalVisitAsync(Guid clinicalVisitId, UpdateClinicalVisitRequest request, string userId);
    Task<ClinicalVisitDto?> CompleteClinicalVisitAsync(Guid clinicalVisitId, CompleteClinicalVisitRequest request, string userId);
    Task<ClinicalVisitDto?> CancelClinicalVisitAsync(Guid clinicalVisitId, string userId);
    Task<PrescriptionDto> AddPrescriptionAsync(Guid clinicalVisitId, AddPrescriptionRequest request, string userId);
    Task<PrescriptionDto?> UpdatePrescriptionAsync(Guid prescriptionId, UpdatePrescriptionRequest request, string userId);
    Task<bool> DeletePrescriptionAsync(Guid prescriptionId, string userId);
}
