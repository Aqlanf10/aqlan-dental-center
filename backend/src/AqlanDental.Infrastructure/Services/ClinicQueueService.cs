using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class ClinicQueueService : IClinicQueueService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] PriorityDisplay = { "عادي", "عاجل", "VIP", "طوارئ" };
    private static readonly string[] StatusDisplay = { "في الانتظار", "تم النداء", "داخل الغرفة", "قيد المعالجة", "مكتمل", "ملغي", "لم يحضر" };

    private static readonly HashSet<QueueStatus> TerminalStatuses = new()
    { QueueStatus.Completed, QueueStatus.Cancelled, QueueStatus.NoShow };

    public ClinicQueueService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<TodayQueueDto> GetTodayQueueAsync(DateOnly? date)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var queueItems = await _context.ClinicQueueItems
            .Include(q => q.Patient)
            .Include(q => q.Doctor)
            .Include(q => q.Room)
            .Where(q => q.QueueDate == targetDate && q.IsActive)
            .OrderByDescending(q => q.Priority)
            .ThenBy(q => q.QueueNumber)
            .ToListAsync();

        var rooms = await _context.ClinicRooms
            .Include(r => r.CurrentDailyVisit)
                .ThenInclude(v => v!.Patient)
            .Where(r => r.IsActive)
            .OrderBy(r => r.Name)
            .ToListAsync();

        return new TodayQueueDto(
            targetDate,
            queueItems.Count(q => q.Status == QueueStatus.Waiting),
            queueItems.Count(q => q.Status == QueueStatus.Called),
            queueItems.Count(q => q.Status == QueueStatus.InRoom),
            queueItems.Count(q => q.Status == QueueStatus.InProgress),
            queueItems.Count(q => q.Status == QueueStatus.Completed),
            queueItems.Count(q => q.Status == QueueStatus.Cancelled),
            queueItems.Select(MapToDto).ToList(),
            rooms.Select(MapRoomToDto).ToList()
        );
    }

    public async Task<ClinicQueueItemDto?> GetQueueItemByIdAsync(Guid id)
    {
        var item = await _context.ClinicQueueItems
            .Include(q => q.Patient)
            .Include(q => q.Doctor)
            .Include(q => q.Room)
            .FirstOrDefaultAsync(q => q.Id == id);

        return item is null ? null : MapToDto(item);
    }

    public async Task<ClinicQueueItemDto> SendDailyVisitToQueueAsync(
        Guid dailyVisitId, SendToQueueRequest request, string userId)
    {
        if (!Enum.IsDefined(typeof(QueuePriority), request.Priority))
            throw new DomainException("INVALID_PRIORITY", "أولوية غير صالحة");

        var dailyVisit = await _context.DailyVisits
            .FirstOrDefaultAsync(v => v.Id == dailyVisitId && v.IsActive);

        if (dailyVisit is null)
            throw new DomainException("VISIT_NOT_FOUND", "الزيارة غير موجودة");

        if (dailyVisit.Status == DailyVisitStatus.Cancelled ||
            dailyVisit.Status == DailyVisitStatus.Completed ||
            dailyVisit.Status == DailyVisitStatus.NoShow)
            throw new DomainException("VISIT_NOT_ACTIVE", "لا يمكن إرسال زيارة ملغاة أو مكتملة أو لم تحضر للطابور");

        var existingQueueItem = await _context.ClinicQueueItems
            .AnyAsync(q => q.DailyVisitId == dailyVisitId && q.IsActive &&
                           q.Status != QueueStatus.Completed &&
                           q.Status != QueueStatus.Cancelled &&
                           q.Status != QueueStatus.NoShow);

        if (existingQueueItem)
            throw new DomainException("ALREADY_IN_QUEUE", "الزيارة موجودة بالفعل في الطابور");

        var queueDate = dailyVisit.VisitDate;
        var nextNumber = await GetNextQueueNumberAsync(queueDate);

        var queueItem = new ClinicQueueItem
        {
            Id = Guid.NewGuid(),
            DailyVisitId = dailyVisitId,
            PatientId = dailyVisit.PatientId,
            DoctorId = dailyVisit.DoctorId,
            RoomId = null,
            QueueDate = queueDate,
            QueueNumber = nextNumber,
            Priority = (QueuePriority)request.Priority,
            Status = QueueStatus.Waiting,
            Notes = request.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.ClinicQueueItems.Add(queueItem);
        await _context.SaveChangesAsync();

        return (await GetQueueItemByIdAsync(queueItem.Id))!;
    }

    public async Task<ClinicQueueItemDto?> UpdatePriorityAsync(
        Guid queueItemId, UpdateQueuePriorityRequest request, string userId)
    {
        if (!Enum.IsDefined(typeof(QueuePriority), request.Priority))
            throw new DomainException("INVALID_PRIORITY", "أولوية غير صالحة");

        var item = await _context.ClinicQueueItems.FindAsync(queueItemId);
        if (item is null || !item.IsActive) return null;

        if (item.Status == QueueStatus.InRoom || TerminalStatuses.Contains(item.Status))
            throw new DomainException("CANNOT_UPDATE_PRIORITY", "لا يمكن تغيير الأولوية بعد دخول الغرفة أو اكتمال الطابور");

        item.Priority = (QueuePriority)request.Priority;
        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetQueueItemByIdAsync(queueItemId);
    }

    public async Task<ClinicQueueItemDto?> CallPatientAsync(
        Guid queueItemId, CallPatientRequest request, string userId)
    {
        var item = await _context.ClinicQueueItems.FindAsync(queueItemId);
        if (item is null || !item.IsActive) return null;

        if (item.Status != QueueStatus.Waiting)
            throw new DomainException("INVALID_CALL_STATUS", "يمكن نداء المريض فقط عندما يكون في الانتظار");

        item.Status = QueueStatus.Called;
        item.CalledAt = DateTime.UtcNow;
        item.Notes = request.Notes ?? item.Notes;
        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetQueueItemByIdAsync(queueItemId);
    }

    public async Task<ClinicQueueItemDto?> EnterRoomAsync(
        Guid queueItemId, EnterRoomRequest request, string userId)
    {
        var item = await _context.ClinicQueueItems.FindAsync(queueItemId);
        if (item is null || !item.IsActive) return null;

        if (item.Status != QueueStatus.Waiting && item.Status != QueueStatus.Called)
            throw new DomainException("INVALID_ENTER_STATUS", "يمكن دخول الغرفة فقط من حالة الانتظار أو بعد النداء");

        var room = await _context.ClinicRooms.FindAsync(request.RoomId);
        if (room is null || !room.IsActive)
            throw new DomainException("ROOM_NOT_FOUND", "الغرفة غير موجودة");

        if (room.IsOccupied && room.CurrentDailyVisitId != item.DailyVisitId)
            throw new DomainException("ROOM_OCCUPIED", "الغرفة مشغولة بمريض آخر");

        item.Status = QueueStatus.InRoom;
        item.RoomId = request.RoomId;
        item.EnteredRoomAt = DateTime.UtcNow;
        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = userId;

        room.IsOccupied = true;
        room.CurrentDailyVisitId = item.DailyVisitId;
        room.UpdatedAt = DateTime.UtcNow;
        room.UpdatedBy = userId;

        var dailyVisit = await _context.DailyVisits.FindAsync(item.DailyVisitId);
        if (dailyVisit is not null)
        {
            dailyVisit.Status = DailyVisitStatus.InProgress;
            dailyVisit.UpdatedAt = DateTime.UtcNow;
            dailyVisit.UpdatedBy = userId;
        }

        await _context.SaveChangesAsync();
        return await GetQueueItemByIdAsync(queueItemId);
    }

    public async Task<ClinicQueueItemDto?> CompleteQueueItemAsync(Guid queueItemId, string userId)
    {
        var item = await _context.ClinicQueueItems.FindAsync(queueItemId);
        if (item is null || !item.IsActive) return null;

        if (item.Status != QueueStatus.InRoom && item.Status != QueueStatus.InProgress)
            throw new DomainException("INVALID_COMPLETE_STATUS", "يمكن إكمال الطابور فقط من داخل الغرفة أو قيد المعالجة");

        await ReleaseRoomAsync(item, userId);

        item.Status = QueueStatus.Completed;
        item.CompletedAt = DateTime.UtcNow;
        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetQueueItemByIdAsync(queueItemId);
    }

    public async Task<ClinicQueueItemDto?> CancelQueueItemAsync(Guid queueItemId, string userId)
    {
        var item = await _context.ClinicQueueItems.FindAsync(queueItemId);
        if (item is null || !item.IsActive) return null;

        if (TerminalStatuses.Contains(item.Status))
            throw new DomainException("ALREADY_TERMINAL", "الطابور بالفعل في حالة نهائية");

        await ReleaseRoomAsync(item, userId);

        item.Status = QueueStatus.Cancelled;
        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetQueueItemByIdAsync(queueItemId);
    }

    private async Task ReleaseRoomAsync(ClinicQueueItem item, string userId)
    {
        if (item.RoomId.HasValue)
        {
            var room = await _context.ClinicRooms.FindAsync(item.RoomId.Value);
            if (room is not null && room.CurrentDailyVisitId == item.DailyVisitId)
            {
                room.IsOccupied = false;
                room.CurrentDailyVisitId = null;
                room.UpdatedAt = DateTime.UtcNow;
                room.UpdatedBy = userId;
            }
        }
    }

    private async Task<int> GetNextQueueNumberAsync(DateOnly queueDate)
    {
        var maxNumber = await _context.ClinicQueueItems
            .Where(q => q.QueueDate == queueDate)
            .MaxAsync(q => (int?)q.QueueNumber) ?? 0;
        return maxNumber + 1;
    }

    private static ClinicQueueItemDto MapToDto(ClinicQueueItem q) => new(
        q.Id,
        q.DailyVisitId,
        q.PatientId,
        q.Patient?.FullName ?? string.Empty,
        q.Patient?.PatientNumber,
        q.DoctorId,
        q.Doctor?.FullName,
        q.RoomId,
        q.Room?.Name,
        q.QueueDate,
        q.QueueNumber,
        (int)q.Priority,
        GetPriorityDisplay((int)q.Priority),
        (int)q.Status,
        GetStatusDisplay((int)q.Status),
        q.CalledAt,
        q.EnteredRoomAt,
        q.CompletedAt,
        q.Notes,
        q.IsActive,
        q.CreatedAt,
        q.UpdatedAt
    );

    private static ClinicRoomDto MapRoomToDto(ClinicRoom r) => new(
        r.Id,
        r.Name,
        r.RoomNumber,
        r.Description,
        r.IsActive,
        r.IsOccupied,
        r.CurrentDailyVisitId,
        r.CurrentDailyVisit?.Patient?.FullName,
        r.CreatedAt,
        r.UpdatedAt
    );

    private static string GetPriorityDisplay(int priority) =>
        priority >= 0 && priority < PriorityDisplay.Length ? PriorityDisplay[priority] : priority.ToString();

    private static string GetStatusDisplay(int status) =>
        status >= 0 && status < StatusDisplay.Length ? StatusDisplay[status] : status.ToString();
}
