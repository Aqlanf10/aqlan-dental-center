namespace AqlanDental.Domain.Entities;

public enum NotificationType
{
    Appointment = 0,
    Payment = 1,
    LabOrder = 2,
    System = 3,
    Queue = 4,
    Message = 5,
}

public class Notification
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
