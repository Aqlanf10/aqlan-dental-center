using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/doctors")]
public class DoctorSchedulesController : ControllerBase
{
    private readonly IDoctorScheduleService _scheduleService;

    public DoctorSchedulesController(IDoctorScheduleService scheduleService)
    {
        _scheduleService = scheduleService;
    }

    [HttpGet("{doctorId:guid}/weekly-schedule")]
    [Authorize(Policy = "DoctorScheduleRead")]
    public async Task<ActionResult<List<DoctorWeeklyScheduleDto>>> GetDoctorWeeklySchedule(Guid doctorId)
    {
        var schedules = await _scheduleService.GetDoctorWeeklyScheduleAsync(doctorId);
        return Ok(schedules);
    }

    [HttpPut("{doctorId:guid}/weekly-schedule")]
    [Authorize(Policy = "DoctorScheduleWrite")]
    public async Task<ActionResult<DoctorWeeklyScheduleDto>> UpsertDoctorWeeklySchedule(
        Guid doctorId, CreateDoctorWeeklyScheduleRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var schedule = await _scheduleService.UpsertDoctorWeeklyScheduleAsync(doctorId, request, userId!);
        return Ok(schedule);
    }

    [HttpPatch("weekly-schedule/{scheduleId:guid}")]
    [Authorize(Policy = "DoctorScheduleWrite")]
    public async Task<ActionResult<DoctorWeeklyScheduleDto>> UpdateDoctorWeeklySchedule(
        Guid scheduleId, UpdateDoctorWeeklyScheduleRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var schedule = await _scheduleService.UpdateDoctorWeeklyScheduleAsync(scheduleId, request, userId!);
        if (schedule is null) return NotFound(new { message = "الجدول الأسبوعي غير موجود" });
        return Ok(schedule);
    }

    [HttpDelete("weekly-schedule/{scheduleId:guid}")]
    [Authorize(Policy = "DoctorScheduleWrite")]
    public async Task<ActionResult> DeleteDoctorWeeklySchedule(Guid scheduleId)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var result = await _scheduleService.DeleteDoctorWeeklyScheduleAsync(scheduleId, userId!);
        if (!result) return NotFound(new { message = "الجدول الأسبوعي غير موجود" });
        return Ok(new { message = "تم حذف الجدول الأسبوعي بنجاح" });
    }

    [HttpGet("available")]
    [Authorize(Policy = "DoctorScheduleRead")]
    public async Task<ActionResult<List<AvailableDoctorDto>>> GetAvailableDoctors([FromQuery] int dayOfWeek)
    {
        var doctors = await _scheduleService.GetAvailableDoctorsForDayAsync(dayOfWeek);
        return Ok(doctors);
    }
}
