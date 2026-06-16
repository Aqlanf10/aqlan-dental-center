using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditService _service;

    public AuditLogsController(IAuditService service) => _service = service;

    [HttpGet]
    [Authorize(Policy = "AuditRead")]
    public async Task<ActionResult> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? userId = null,
        [FromQuery] string? resource = null,
        [FromQuery] int? action = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _service.GetLogsAsync(page, pageSize, userId, resource, action, fromDate, toDate);
        return Ok(result);
    }
}
