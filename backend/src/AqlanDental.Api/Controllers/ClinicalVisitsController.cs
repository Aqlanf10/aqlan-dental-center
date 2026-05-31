using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/clinical-visits")]
public class ClinicalVisitsController : ControllerBase
{
    private readonly IClinicalVisitService _clinicalVisitService;

    public ClinicalVisitsController(IClinicalVisitService clinicalVisitService)
    {
        _clinicalVisitService = clinicalVisitService;
    }

    [HttpGet("today")]
    [Authorize(Policy = "ClinicalVisitsRead")]
    public async Task<ActionResult<TodayClinicalVisitsDto>> GetToday([FromQuery] DateOnly? date)
    {
        var result = await _clinicalVisitService.GetTodayClinicalVisitsAsync(date);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "ClinicalVisitsRead")]
    public async Task<ActionResult<ClinicalVisitDto>> GetById(Guid id)
    {
        var visit = await _clinicalVisitService.GetClinicalVisitByIdAsync(id);
        if (visit is null) return NotFound(new { message = "الزيارة السريرية غير موجودة" });
        return Ok(visit);
    }

    [HttpGet("by-daily-visit/{dailyVisitId:guid}")]
    [Authorize(Policy = "ClinicalVisitsRead")]
    public async Task<ActionResult<ClinicalVisitDto>> GetByDailyVisitId(Guid dailyVisitId)
    {
        var visit = await _clinicalVisitService.GetClinicalVisitByDailyVisitIdAsync(dailyVisitId);
        if (visit is null) return NotFound(new { message = "لا توجد زيارة سريرية لهذه الزيارة اليومية" });
        return Ok(visit);
    }

    [HttpPost("daily-visits/{dailyVisitId:guid}/start")]
    [Authorize(Policy = "ClinicalVisitsWrite")]
    public async Task<ActionResult<ClinicalVisitDto>> Start(Guid dailyVisitId, StartClinicalVisitRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _clinicalVisitService.StartClinicalVisitAsync(dailyVisitId, request, userId!);
        return CreatedAtAction(nameof(GetById), new { id = visit.Id }, visit);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "ClinicalVisitsWrite")]
    public async Task<ActionResult<ClinicalVisitDto>> Update(Guid id, UpdateClinicalVisitRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _clinicalVisitService.UpdateClinicalVisitAsync(id, request, userId!);
        if (visit is null) return NotFound(new { message = "الزيارة السريرية غير موجودة" });
        return Ok(visit);
    }

    [HttpPost("{id:guid}/complete")]
    [Authorize(Policy = "ClinicalVisitsCancel")]
    public async Task<ActionResult<ClinicalVisitDto>> Complete(Guid id, CompleteClinicalVisitRequest? request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _clinicalVisitService.CompleteClinicalVisitAsync(id, request ?? new CompleteClinicalVisitRequest(null, null, null, null, null), userId!);
        if (visit is null) return NotFound(new { message = "الزيارة السريرية غير موجودة" });
        return Ok(visit);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = "ClinicalVisitsCancel")]
    public async Task<ActionResult<ClinicalVisitDto>> Cancel(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _clinicalVisitService.CancelClinicalVisitAsync(id, userId!);
        if (visit is null) return NotFound(new { message = "الزيارة السريرية غير موجودة" });
        return Ok(visit);
    }

    [HttpPost("{id:guid}/prescriptions")]
    [Authorize(Policy = "PrescriptionsWrite")]
    public async Task<ActionResult<PrescriptionDto>> AddPrescription(Guid id, AddPrescriptionRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var prescription = await _clinicalVisitService.AddPrescriptionAsync(id, request, userId!);
        return CreatedAtAction(nameof(GetById), new { id }, prescription);
    }

    [HttpPut("prescriptions/{prescriptionId:guid}")]
    [Authorize(Policy = "PrescriptionsWrite")]
    public async Task<ActionResult<PrescriptionDto>> UpdatePrescription(
        Guid prescriptionId, UpdatePrescriptionRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var prescription = await _clinicalVisitService.UpdatePrescriptionAsync(prescriptionId, request, userId!);
        if (prescription is null) return NotFound(new { message = "الوصفة الطبية غير موجودة" });
        return Ok(prescription);
    }

    [HttpDelete("prescriptions/{prescriptionId:guid}")]
    [Authorize(Policy = "PrescriptionsWrite")]
    public async Task<IActionResult> DeletePrescription(Guid prescriptionId)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var deleted = await _clinicalVisitService.DeletePrescriptionAsync(prescriptionId, userId!);
        if (!deleted) return NotFound(new { message = "الوصفة الطبية غير موجودة" });
        return NoContent();
    }
}
