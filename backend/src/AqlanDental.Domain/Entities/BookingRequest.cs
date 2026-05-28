namespace AqlanDental.Domain.Entities;

public class BookingRequest
{
    public Guid Id { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string ServiceType { get; set; } = string.Empty;
    public Guid? PreferredDoctorId { get; set; }
    public DateOnly? PreferredDate { get; set; }
    public TimeOnly? PreferredTime { get; set; }
    public string? Notes { get; set; }
    public BookingRequestStatus Status { get; set; } = BookingRequestStatus.New;
    public Guid? LinkedPatientId { get; set; }
    public Guid? ConvertedAppointmentId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public Doctor? PreferredDoctor { get; set; }
    public Patient? LinkedPatient { get; set; }
    public Appointment? ConvertedAppointment { get; set; }
}

public enum BookingRequestStatus
{
    New = 0,
    Contacted = 1,
    Approved = 2,
    Rejected = 3,
    ConvertedToAppointment = 4,
    Cancelled = 5
}
