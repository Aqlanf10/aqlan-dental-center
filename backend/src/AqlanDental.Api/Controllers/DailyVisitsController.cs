using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DailyVisitsController : ControllerBase
{
    private readonly IDailyVisitService _dailyVisitService;

    public DailyVisitsController(IDailyVisitService dailyVisitService)
    {
        _dailyVisitService = dailyVisitService;
    }

    [HttpGet("today")]
    [Authorize(Policy = "DailyVisitsRead")]
    public async Task<ActionResult<TodayDailyVisitsDto>> GetToday([FromQuery] DateOnly? date)
    {
        var result = await _dailyVisitService.GetTodayAsync(date);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "DailyVisitsRead")]
    public async Task<ActionResult<DailyVisitDto>> GetVisit(Guid id)
    {
        var visit = await _dailyVisitService.GetVisitByIdAsync(id);
        if (visit is null) return NotFound(new { message = "الزيارة غير موجودة" });
        return Ok(visit);
    }

    [HttpPost("appointments/{appointmentId:guid}/check-in")]
    [Authorize(Policy = "DailyVisitsWrite")]
    public async Task<ActionResult<DailyVisitDto>> CheckInAppointment(
        Guid appointmentId, CheckInAppointmentRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _dailyVisitService.CheckInAppointmentAsync(appointmentId, request, userId!);
        return CreatedAtAction(nameof(GetVisit), new { id = visit.Id }, visit);
    }

    [HttpPost("walk-in")]
    [Authorize(Policy = "DailyVisitsWrite")]
    public async Task<ActionResult<DailyVisitDto>> CreateWalkInVisit(
        CreateWalkInVisitRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _dailyVisitService.CreateWalkInVisitAsync(request, userId!);
        return CreatedAtAction(nameof(GetVisit), new { id = visit.Id }, visit);
    }

    [HttpPatch("{visitId:guid}/status")]
    [Authorize(Policy = "DailyVisitsWrite")]
    public async Task<ActionResult<DailyVisitDto>> UpdateVisitStatus(
        Guid visitId, UpdateDailyVisitStatusRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _dailyVisitService.UpdateVisitStatusAsync(visitId, request, userId!);
        if (visit is null) return NotFound(new { message = "الزيارة غير موجودة" });
        return Ok(visit);
    }

    [HttpPost("{visitId:guid}/cancel")]
    [Authorize(Policy = "DailyVisitsWrite")]
    public async Task<ActionResult<DailyVisitDto>> CancelVisit(Guid visitId)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _dailyVisitService.CancelVisitAsync(visitId, userId!);
        if (visit is null) return NotFound(new { message = "الزيارة غير موجودة" });
        return Ok(visit);
    }

    [HttpPost("appointments/{appointmentId:guid}/no-show")]
    [Authorize(Policy = "DailyVisitsWrite")]
    public async Task<ActionResult<DailyVisitDto>> MarkNoShow(Guid appointmentId)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _dailyVisitService.MarkNoShowAsync(appointmentId, userId!);
        if (visit is null) return NotFound(new { message = "الزيارة غير موجودة" });
        return Ok(visit);
    }
}
