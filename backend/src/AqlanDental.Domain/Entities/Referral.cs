namespace AqlanDental.Domain.Entities;

public enum ReferralStatus
{
    Pending = 0,
    Accepted = 1,
    Rejected = 2,
}

public class Referral
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid FromDoctorId { get; set; }
    public Guid ToDoctorId { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public ReferralStatus Status { get; set; } = ReferralStatus.Pending;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Patient Patient { get; set; } = null!;
    public Doctor FromDoctor { get; set; } = null!;
    public Doctor ToDoctor { get; set; } = null!;
}
