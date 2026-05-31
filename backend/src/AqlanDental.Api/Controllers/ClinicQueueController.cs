using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClinicQueueController : ControllerBase
{
    private readonly IClinicQueueService _clinicQueueService;

    public ClinicQueueController(IClinicQueueService clinicQueueService)
    {
        _clinicQueueService = clinicQueueService;
    }

    [HttpGet("today")]
    [Authorize(Policy = "ClinicQueueRead")]
    public async Task<ActionResult<TodayQueueDto>> GetTodayQueue([FromQuery] DateOnly? date)
    {
        var result = await _clinicQueueService.GetTodayQueueAsync(date);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "ClinicQueueRead")]
    public async Task<ActionResult<ClinicQueueItemDto>> GetQueueItem(Guid id)
    {
        var item = await _clinicQueueService.GetQueueItemByIdAsync(id);
        if (item is null) return NotFound(new { message = "عنصر الطابور غير موجود" });
        return Ok(item);
    }

    [HttpPost("daily-visits/{dailyVisitId:guid}/send")]
    [Authorize(Policy = "ClinicQueueWrite")]
    public async Task<ActionResult<ClinicQueueItemDto>> SendToQueue(
        Guid dailyVisitId, SendToQueueRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var item = await _clinicQueueService.SendDailyVisitToQueueAsync(dailyVisitId, request, userId!);
        return CreatedAtAction(nameof(GetQueueItem), new { id = item.Id }, item);
    }

    [HttpPatch("{id:guid}/priority")]
    [Authorize(Policy = "ClinicQueueWrite")]
    public async Task<ActionResult<ClinicQueueItemDto>> UpdatePriority(
        Guid id, UpdateQueuePriorityRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var item = await _clinicQueueService.UpdatePriorityAsync(id, request, userId!);
        if (item is null) return NotFound(new { message = "عنصر الطابور غير موجود" });
        return Ok(item);
    }

    [HttpPost("{id:guid}/call")]
    [Authorize(Policy = "ClinicQueueWrite")]
    public async Task<ActionResult<ClinicQueueItemDto>> CallPatient(
        Guid id, CallPatientRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var item = await _clinicQueueService.CallPatientAsync(id, request, userId!);
        if (item is null) return NotFound(new { message = "عنصر الطابور غير موجود" });
        return Ok(item);
    }

    [HttpPost("{id:guid}/enter-room")]
    [Authorize(Policy = "ClinicQueueWrite")]
    public async Task<ActionResult<ClinicQueueItemDto>> EnterRoom(
        Guid id, EnterRoomRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var item = await _clinicQueueService.EnterRoomAsync(id, request, userId!);
        if (item is null) return NotFound(new { message = "عنصر الطابور غير موجود" });
        return Ok(item);
    }

    [HttpPost("{id:guid}/complete")]
    [Authorize(Policy = "ClinicQueueWrite")]
    public async Task<ActionResult<ClinicQueueItemDto>> CompleteQueueItem(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var item = await _clinicQueueService.CompleteQueueItemAsync(id, userId!);
        if (item is null) return NotFound(new { message = "عنصر الطابور غير موجود" });
        return Ok(item);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = "ClinicQueueWrite")]
    public async Task<ActionResult<ClinicQueueItemDto>> CancelQueueItem(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var item = await _clinicQueueService.CancelQueueItemAsync(id, userId!);
        if (item is null) return NotFound(new { message = "عنصر الطابور غير موجود" });
        return Ok(item);
    }
}
