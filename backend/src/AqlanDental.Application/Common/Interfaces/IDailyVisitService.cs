namespace AqlanDental.Application.Common.Interfaces;

public record DailyVisitDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid? DoctorId,
    string? DoctorName,
    Guid? AppointmentId,
    DateOnly VisitDate,
    int VisitType,
    string VisitTypeDisplay,
    int Status,
    string StatusDisplay,
    TimeOnly? ArrivalTime,
    string? ChiefComplaint,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record TodayDailyVisitsDto(
    DateOnly Date,
    int TotalAppointments,
    int CheckedInCount,
    int WaitingCount,
    int ReadyForDoctorCount,
    int InProgressCount,
    int CompletedCount,
    int CancelledCount,
    int NoShowCount,
    List<AppointmentDto> TodayAppointments,
    List<DailyVisitDto> Visits
);

public record CheckInAppointmentRequest(
    string? ChiefComplaint,
    string? Notes
);

public record CreateWalkInVisitRequest(
    Guid PatientId,
    Guid? DoctorId,
    DateOnly? VisitDate,
    string? ChiefComplaint,
    string? Notes
);

public record UpdateDailyVisitStatusRequest(int Status);

public interface IDailyVisitService
{
    Task<TodayDailyVisitsDto> GetTodayAsync(DateOnly? date);
    Task<DailyVisitDto?> GetVisitByIdAsync(Guid id);
    Task<DailyVisitDto> CheckInAppointmentAsync(Guid appointmentId, CheckInAppointmentRequest request, string userId);
    Task<DailyVisitDto> CreateWalkInVisitAsync(CreateWalkInVisitRequest request, string userId);
    Task<DailyVisitDto?> UpdateVisitStatusAsync(Guid visitId, UpdateDailyVisitStatusRequest request, string userId);
    Task<DailyVisitDto?> CancelVisitAsync(Guid visitId, string userId);
    Task<DailyVisitDto?> MarkNoShowAsync(Guid appointmentId, string userId);
}
