using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;

namespace AqlanDental.Infrastructure.Services;

public class NotificationService : INotificationService
{
    public Task<NotificationDto> CreateAsync(CreateNotificationRequest request)
        => throw new NotImplementedException();

    public Task<PagedResult<NotificationDto>> GetByUserAsync(string userId, int page, int pageSize)
        => Task.FromResult(new PagedResult<NotificationDto>([], 0, page, pageSize, 0));

    public Task<int> GetUnreadCountAsync(string userId)
        => Task.FromResult(0);

    public Task<bool> MarkAsReadAsync(Guid id, string userId)
        => Task.FromResult(false);

    public Task<int> MarkAllAsReadAsync(string userId)
        => Task.FromResult(0);

    public Task<bool> DeleteAsync(Guid id, string userId)
        => Task.FromResult(false);
}
