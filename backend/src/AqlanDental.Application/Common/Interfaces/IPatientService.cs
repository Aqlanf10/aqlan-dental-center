using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

public record MedicalHistoryDto(
    string? ChronicDiseases,
    string? CurrentMedications,
    string? DrugAllergies,
    bool BleedingDisorders,
    string? IsPregnant,
    bool TmjProblems,
    string? PreviousSurgeries,
    string? Notes
);

public record DentalHistoryDto(
    string? ChiefComplaint,
    string? PreviousTreatments,
    bool MouthBreathing,
    bool Bruxism,
    bool ThumbSucking,
    bool TongueThrusting,
    string? Notes
);

public record UpsertMedicalHistoryRequest(
    string? ChronicDiseases,
    string? CurrentMedications,
    string? DrugAllergies,
    bool BleedingDisorders,
    string? IsPregnant,
    bool TmjProblems,
    string? PreviousSurgeries,
    string? Notes
);

public record UpsertDentalHistoryRequest(
    string? ChiefComplaint,
    string? PreviousTreatments,
    bool MouthBreathing,
    bool Bruxism,
    bool ThumbSucking,
    bool TongueThrusting,
    string? Notes
);

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

public record PatientSummaryDto(
    PatientDto Patient,
    AppointmentDto? LastAppointment,
    ClinicalVisitDto? LastClinicalVisit,
    int TotalClinicalVisits,
    List<ClinicalProcedureDto> LatestProcedures,
    List<PrescriptionSummaryDto> LatestPrescriptions
);

public record PrescriptionSummaryDto(
    Guid Id,
    string MedicationName,
    string? Dosage,
    string? Frequency,
    string? Duration,
    DateTime CreatedAt
);

public record PatientTimelineDto(
    List<TimelineEntryDto> Entries
);

public record TimelineEntryDto(
    string Type, // "appointment", "dailyVisit", "clinicalVisit", "procedure", "prescription"
    Guid Id,
    string Title,
    string? Subtitle,
    DateTime Date,
    string? StatusDisplay
);

public interface IPatientService
{
    Task<PagedResult<PatientDto>> GetPatientsAsync(int page, int pageSize, string? search);
    Task<PatientDto?> GetPatientByIdAsync(Guid id);
    Task<PatientDto> CreatePatientAsync(CreatePatientRequest request, string userId);
    Task<PatientDto?> UpdatePatientAsync(Guid id, UpdatePatientRequest request, string userId);
    Task<bool> SoftDeletePatientAsync(Guid id);
    Task<PatientSummaryDto?> GetPatientSummaryAsync(Guid id);
    Task<PatientTimelineDto> GetPatientTimelineAsync(Guid id);
    Task<MedicalHistoryDto?> GetMedicalHistoryAsync(Guid patientId);
    Task<MedicalHistoryDto?> UpsertMedicalHistoryAsync(Guid patientId, UpsertMedicalHistoryRequest request, string userId);
    Task<DentalHistoryDto?> GetDentalHistoryAsync(Guid patientId);
    Task<DentalHistoryDto?> UpsertDentalHistoryAsync(Guid patientId, UpsertDentalHistoryRequest request, string userId);
}
