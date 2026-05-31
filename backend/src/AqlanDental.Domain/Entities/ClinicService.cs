namespace AqlanDental.Domain.Entities;

public enum ServiceCategory
{
    Consultation = 0,
    Preventive = 1,
    Restorative = 2,
    Endodontics = 3,
    Prosthodontics = 4,
    Orthodontics = 5,
    Surgery = 6,
    Cosmetic = 7,
    Radiology = 8,
    Other = 99,
}

public class ClinicService
{
    public Guid Id { get; set; }
    public string ArabicName { get; set; } = string.Empty;
    public string EnglishName { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Department { get; set; }
    public ServiceCategory Category { get; set; } = ServiceCategory.Other;
    public string? Description { get; set; }
    public int DefaultDurationMinutes { get; set; } = 30;
    public decimal DefaultPrice { get; set; } = 0;
    public bool RequiresDoctor { get; set; } = true;
    public bool ShowInBooking { get; set; } = true;
    public bool ShowInReception { get; set; } = true;
    public bool ShowInTreatmentPlan { get; set; } = true;
    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
