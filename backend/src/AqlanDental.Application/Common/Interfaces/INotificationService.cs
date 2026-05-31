using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── Notification DTOs ─────────────────────────────────────────────

public record NotificationDto(
    Guid Id,
    string UserId,
    int Type,
    string TypeDisplay,
    string Title,
    string Message,
    string? Link,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt
);

public record CreateNotificationRequest(
    string UserId,
    int Type,
    string Title,
    string Message,
    string? Link = null
);

// ─── Interface ─────────────────────────────────────────────────────

public interface INotificationService
{
    Task<NotificationDto> CreateAsync(CreateNotificationRequest request);
    Task<PagedResult<NotificationDto>> GetByUserAsync(string userId, int page, int pageSize);
    Task<int> GetUnreadCountAsync(string userId);
    Task<bool> MarkAsReadAsync(Guid id, string userId);
    Task<int> MarkAllAsReadAsync(string userId);
    Task<bool> DeleteAsync(Guid id, string userId);
}
