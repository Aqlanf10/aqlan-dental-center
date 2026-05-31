namespace AqlanDental.Application.Common.Interfaces;

public record ClinicQueueItemDto(
    Guid Id,
    Guid DailyVisitId,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid? DoctorId,
    string? DoctorName,
    Guid? RoomId,
    string? RoomName,
    DateOnly QueueDate,
    int QueueNumber,
    int Priority,
    string PriorityDisplay,
    int Status,
    string StatusDisplay,
    DateTime? CalledAt,
    DateTime? EnteredRoomAt,
    DateTime? CompletedAt,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record TodayQueueDto(
    DateOnly Date,
    int WaitingCount,
    int CalledCount,
    int InRoomCount,
    int InProgressCount,
    int CompletedCount,
    int CancelledCount,
    List<ClinicQueueItemDto> QueueItems,
    List<ClinicRoomDto> Rooms
);

public record SendToQueueRequest(
    int Priority,
    string? Notes
);

public record UpdateQueuePriorityRequest(int Priority);

public record CallPatientRequest(string? Notes);

public record EnterRoomRequest(Guid RoomId);

public interface IClinicQueueService
{
    Task<TodayQueueDto> GetTodayQueueAsync(DateOnly? date);
    Task<ClinicQueueItemDto?> GetQueueItemByIdAsync(Guid id);
    Task<ClinicQueueItemDto> SendDailyVisitToQueueAsync(Guid dailyVisitId, SendToQueueRequest request, string userId);
    Task<ClinicQueueItemDto?> UpdatePriorityAsync(Guid queueItemId, UpdateQueuePriorityRequest request, string userId);
    Task<ClinicQueueItemDto?> CallPatientAsync(Guid queueItemId, CallPatientRequest request, string userId);
    Task<ClinicQueueItemDto?> EnterRoomAsync(Guid queueItemId, EnterRoomRequest request, string userId);
    Task<ClinicQueueItemDto?> CompleteQueueItemAsync(Guid queueItemId, string userId);
    Task<ClinicQueueItemDto?> CancelQueueItemAsync(Guid queueItemId, string userId);
}
