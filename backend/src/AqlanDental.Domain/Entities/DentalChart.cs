namespace AqlanDental.Domain.Entities;

public enum ToothConditionType
{
    Healthy = 0,
    Caries = 1,
    Filled = 2,
    Crown = 3,
    Missing = 4,
    Implant = 5,
    RootCanal = 6,
    Bridge = 7,
    Veneer = 8,
    Other = 99,
}

public class DentalChart
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public DateOnly ChartDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public Guid? DoctorId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Patient Patient { get; set; } = null!;
    public Doctor? Doctor { get; set; }
    public List<ToothCondition> ToothConditions { get; set; } = new();
}

public class ToothCondition
{
    public Guid Id { get; set; }
    public Guid ChartId { get; set; }
    public int ToothNumber { get; set; } // FDI notation: 11-18, 21-28, 31-38, 41-48
    public ToothConditionType Condition { get; set; } = ToothConditionType.Healthy;
    public string? SurfacesAffected { get; set; } // e.g. "M,O" for Mesial, Occlusal
    public string? Notes { get; set; }
    public string? TreatmentDone { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DentalChart Chart { get; set; } = null!;
}
