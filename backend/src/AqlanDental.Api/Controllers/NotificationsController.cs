using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _service;

    public NotificationsController(INotificationService service) => _service = service;

    [HttpGet]
    [Authorize(Policy = "NotificationRead")]
    public async Task<ActionResult> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!;
        var result = await _service.GetByUserAsync(userId, page, pageSize);
        return Ok(result);
    }

    [HttpGet("unread-count")]
    [Authorize(Policy = "NotificationRead")]
    public async Task<ActionResult> GetUnreadCount()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!;
        var count = await _service.GetUnreadCountAsync(userId);
        return Ok(new { count });
    }

    [HttpPut("{id:guid}/read")]
    [Authorize(Policy = "NotificationRead")]
    public async Task<ActionResult> MarkAsRead(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!;
        var result = await _service.MarkAsReadAsync(id, userId);
        if (!result) return NotFound(new { message = "Notification not found" });
        return Ok(new { message = "Marked as read" });
    }

    [HttpPut("read-all")]
    [Authorize(Policy = "NotificationRead")]
    public async Task<ActionResult> MarkAllAsRead()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!;
        var count = await _service.MarkAllAsReadAsync(userId);
        return Ok(new { count });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "NotificationRead")]
    public async Task<ActionResult> DeleteNotification(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!;
        var result = await _service.DeleteAsync(id, userId);
        if (!result) return NotFound(new { message = "Notification not found" });
        return NoContent();
    }
}
