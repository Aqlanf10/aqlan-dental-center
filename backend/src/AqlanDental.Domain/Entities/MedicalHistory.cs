namespace AqlanDental.Domain.Entities;

public class MedicalHistory
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? ChronicDiseases { get; set; }
    public string? CurrentMedications { get; set; }
    public string? DrugAllergies { get; set; }
    public bool BleedingDisorders { get; set; } = false;
    public string? IsPregnant { get; set; } // "yes", "no", "na" (not applicable)
    public bool TmjProblems { get; set; } = false;
    public string? PreviousSurgeries { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public Patient Patient { get; set; } = null!;
}
