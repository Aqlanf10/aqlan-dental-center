using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] NotificationTypeDisplay = {
        "موعد", "دفعة", "طلب مختبر", "نظام", "طابور", "رسالة"
    };

    public NotificationService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<NotificationDto> CreateAsync(CreateNotificationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserId))
            throw new DomainException("USER_ID_REQUIRED", "معرف المستخدم مطلوب");

        var user = await _context.Users.FindAsync(request.UserId);
        if (user is null)
            throw new DomainException("USER_NOT_FOUND", "المستخدم غير موجود");

        if (!Enum.IsDefined(typeof(NotificationType), request.Type))
            throw new DomainException("INVALID_NOTIFICATION_TYPE", "نوع الإشعار غير صالح");

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new DomainException("NOTIFICATION_TITLE_REQUIRED", "عنوان الإشعار مطلوب");

        if (string.IsNullOrWhiteSpace(request.Message))
            throw new DomainException("NOTIFICATION_MESSAGE_REQUIRED", "نص الإشعار مطلوب");

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            Type = (NotificationType)request.Type,
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            Link = request.Link?.Trim(),
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        return MapNotificationToDto(notification);
    }

    public async Task<PagedResult<NotificationDto>> GetByUserAsync(string userId, int page, int pageSize)
    {
        var query = _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapNotificationToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<NotificationDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<int> GetUnreadCountAsync(string userId)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync();
    }

    public async Task<bool> MarkAsReadAsync(Guid id, string userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification is null) return false;

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return true;
    }

    public async Task<int> MarkAllAsReadAsync(string userId)
    {
        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }

        await _context.SaveChangesAsync();
        return unreadNotifications.Count;
    }

    public async Task<bool> DeleteAsync(Guid id, string userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification is null) return false;

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();
        return true;
    }

    // ─── Mapping methods ───────────────────────────────────────────

    private static NotificationDto MapNotificationToDto(Notification n) => new(
        n.Id,
        n.UserId,
        (int)n.Type,
        GetNotificationTypeDisplay((int)n.Type),
        n.Title,
        n.Message,
        n.Link,
        n.IsRead,
        n.ReadAt,
        n.CreatedAt
    );

    private static string GetNotificationTypeDisplay(int type) =>
        type >= 0 && type < NotificationTypeDisplay.Length
            ? NotificationTypeDisplay[type]
            : type.ToString();
}
