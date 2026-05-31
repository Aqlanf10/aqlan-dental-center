using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── AuditLog DTOs ─────────────────────────────────────────────────

public record AuditLogDto(
    Guid Id,
    string? UserId,
    string? UserName,
    int Action,
    string ActionDisplay,
    string Resource,
    Guid? ResourceId,
    string? IpAddress,
    string? Details,
    string? NewData,
    string? OldData,
    DateTime Timestamp
);

// ─── Interface ─────────────────────────────────────────────────────

public interface IAuditService
{
    Task LogAsync(string? userId, int action, string resource, Guid? resourceId, string? ipAddress, string? details, string? newData = null, string? oldData = null);
    Task<PagedResult<AuditLogDto>> GetLogsAsync(int page, int pageSize, string? userId, string? resource, int? action, DateTime? fromDate, DateTime? toDate);
}
