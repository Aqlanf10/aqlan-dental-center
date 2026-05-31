namespace AqlanDental.Domain.Entities;

public class Prescription
{
    public Guid Id { get; set; }
    public Guid ClinicalVisitId { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string MedicationName { get; set; } = string.Empty;
    public string? Dosage { get; set; }
    public string? Frequency { get; set; }
    public string? Duration { get; set; }
    public string? Instructions { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public ClinicalVisit ClinicalVisit { get; set; } = null!;
    public Patient Patient { get; set; } = null!;
    public Doctor Doctor { get; set; } = null!;
}
