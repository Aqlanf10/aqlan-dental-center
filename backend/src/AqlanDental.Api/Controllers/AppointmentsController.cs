using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public AppointmentsController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    [HttpGet]
    [Authorize(Policy = "AppointmentRead")]
    public async Task<ActionResult<PagedResult<AppointmentDto>>> GetAppointments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null,
        [FromQuery] Guid? doctorId = null,
        [FromQuery] Guid? patientId = null,
        [FromQuery] int? status = null)
    {
        var result = await _appointmentService.GetAppointmentsAsync(
            page, pageSize, search, dateFrom, dateTo, doctorId, patientId, status);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "AppointmentRead")]
    public async Task<ActionResult<AppointmentDto>> GetAppointment(Guid id)
    {
        var appointment = await _appointmentService.GetAppointmentByIdAsync(id);
        if (appointment is null) return NotFound(new { message = "الموعد غير موجود" });
        return Ok(appointment);
    }

    [HttpPost]
    [Authorize(Policy = "AppointmentWrite")]
    public async Task<ActionResult<AppointmentDto>> CreateAppointment(
        CreateAppointmentRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var appointment = await _appointmentService.CreateAppointmentAsync(request, userId!);
        return CreatedAtAction(nameof(GetAppointment), new { id = appointment.Id }, appointment);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AppointmentWrite")]
    public async Task<ActionResult<AppointmentDto>> UpdateAppointment(
        Guid id, UpdateAppointmentRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var appointment = await _appointmentService.UpdateAppointmentAsync(id, request, userId!);
        if (appointment is null) return NotFound(new { message = "الموعد غير موجود" });
        return Ok(appointment);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "AppointmentStatusUpdate")]
    public async Task<ActionResult<AppointmentDto>> UpdateAppointmentStatus(
        Guid id, UpdateAppointmentStatusRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var appointment = await _appointmentService.UpdateAppointmentStatusAsync(id, request, userId!);
        if (appointment is null) return NotFound(new { message = "الموعد غير موجود" });
        return Ok(appointment);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AppointmentDelete")]
    public async Task<ActionResult> DeleteAppointment(Guid id)
    {
        var result = await _appointmentService.SoftDeleteAppointmentAsync(id);
        if (!result) return NotFound(new { message = "الموعد غير موجود" });
        return Ok(new { message = "تم حذف الموعد بنجاح" });
    }
}
