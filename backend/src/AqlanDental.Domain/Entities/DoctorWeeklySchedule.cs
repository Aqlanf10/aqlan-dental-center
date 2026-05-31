namespace AqlanDental.Domain.Entities;

public class DoctorWeeklySchedule
{
    public Guid Id { get; set; }
    public Guid DoctorId { get; set; }
    /// <summary>
    /// Day of week: 0=Saturday, 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday
    /// Using custom mapping to align with Yemen work week (Saturday-Thursday)
    /// </summary>
    public int DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public TimeOnly? BreakStartTime { get; set; }
    public TimeOnly? BreakEndTime { get; set; }
    public int DefaultAppointmentDurationMinutes { get; set; } = 30;
    public bool IsAvailableForBooking { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public Doctor Doctor { get; set; } = null!;
}
