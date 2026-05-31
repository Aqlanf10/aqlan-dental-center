namespace AqlanDental.Domain.Entities;

public class DentalHistory
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? ChiefComplaint { get; set; }
    public string? PreviousTreatments { get; set; }
    public bool MouthBreathing { get; set; } = false;
    public bool Bruxism { get; set; } = false;
    public bool ThumbSucking { get; set; } = false;
    public bool TongueThrusting { get; set; } = false;
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public Patient Patient { get; set; } = null!;
}
