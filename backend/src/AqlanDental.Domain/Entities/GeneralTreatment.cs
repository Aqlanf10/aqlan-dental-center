namespace AqlanDental.Domain.Entities;

public enum GeneralTreatmentType
{
    Examination = 0,
    Cleaning = 1,
    Filling = 2,
    Extraction = 3,
    RootCanal = 4,
    Crown = 5,
    Bridge = 6,
    Denture = 7,
    Whitening = 8,
    Veneer = 9,
    Sealant = 10,
    Fluoride = 11,
    Other = 99,
}

public class GeneralTreatment
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? VisitId { get; set; }
    public GeneralTreatmentType TreatmentType { get; set; }
    public int? ToothNumber { get; set; }
    public string? MaterialUsed { get; set; }
    public string? AnesthesiaType { get; set; }
    public decimal? Cost { get; set; }
    public Guid? DoctorId { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Patient Patient { get; set; } = null!;
    public ClinicalVisit? Visit { get; set; }
    public Doctor? Doctor { get; set; }
}
