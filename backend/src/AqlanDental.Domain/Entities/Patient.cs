namespace AqlanDental.Domain.Entities;

public class Patient
{
    public Guid Id { get; set; }
    public string PatientNumber { get; set; } = string.Empty;  // P-0001 format, unique
    public string FullName { get; set; } = string.Empty;
    public Gender Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string? WhatsAppNumber { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation properties
    public MedicalHistory? MedicalHistory { get; set; }
    public DentalHistory? DentalHistory { get; set; }
    public List<DentalChart> DentalCharts { get; set; } = new();
    public List<GeneralTreatment> GeneralTreatments { get; set; } = new();
    public List<TreatmentPlanStep> TreatmentPlanSteps { get; set; } = new();
}

public enum Gender
{
    Male = 0,
    Female = 1
}
