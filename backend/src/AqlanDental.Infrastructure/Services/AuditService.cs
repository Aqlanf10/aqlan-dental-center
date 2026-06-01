using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] ActionDisplay = {
        "إنشاء", "قراءة", "تحديث", "حذف", "اعتماد", "رفض", "دخول", "فشل دخول", "خروج"
    };

    public AuditService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(string? userId, int action, string resource, Guid? resourceId,
        string? ipAddress, string? details, string? newData = null, string? oldData = null)
    {
        var log = new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = (AuditAction)action,
            Resource = resource,
            ResourceId = resourceId,
            IpAddress = ipAddress,
            Details = details,
            NewData = newData,
            OldData = oldData,
            Timestamp = DateTime.UtcNow
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    public async Task<PagedResult<AuditLogDto>> GetLogsAsync(
        int page, int pageSize, string? userId, string? resource, int? action,
        DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(userId))
            query = query.Where(l => l.UserId == userId);

        if (!string.IsNullOrWhiteSpace(resource))
            query = query.Where(l => l.Resource.Contains(resource));

        if (action.HasValue)
            query = query.Where(l => l.Action == (AuditAction)action.Value);

        if (fromDate.HasValue)
            query = query.Where(l => l.Timestamp >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(l => l.Timestamp <= toDate.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(l => l.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Get user names in batch
        var userIds = items.Where(i => i.UserId is not null).Select(i => i.UserId!).Distinct().ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        var dtos = items.Select(l => new AuditLogDto(
            l.Id,
            l.UserId,
            l.UserId is not null && users.TryGetValue(l.UserId, out var name) ? name : null,
            (int)l.Action,
            GetActionDisplay((int)l.Action),
            l.Resource,
            l.ResourceId,
            l.IpAddress,
            l.Details,
            l.NewData,
            l.OldData,
            l.Timestamp
        )).ToList();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<AuditLogDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    private static string GetActionDisplay(int action) =>
        action >= 0 && action < ActionDisplay.Length ? ActionDisplay[action] : action.ToString();
}
