using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/general")]
public class GeneralDentistryController : ControllerBase
{
    private readonly IGeneralDentistryService _generalDentistryService;

    public GeneralDentistryController(IGeneralDentistryService generalDentistryService)
    {
        _generalDentistryService = generalDentistryService;
    }

    // ─── Dental Chart ─────────────────────────────────────────────────

    [HttpGet("dental-chart/{patientId:guid}")]
    [Authorize(Policy = "GeneralDentistryRead")]
    public async Task<ActionResult<DentalChartDto>> GetDentalChart(Guid patientId)
    {
        var chart = await _generalDentistryService.GetDentalChartAsync(patientId);
        if (chart is null) return NotFound(new { message = "مخطط الأسنان غير موجود" });
        return Ok(chart);
    }

    [HttpPut("dental-chart/{patientId:guid}")]
    [Authorize(Policy = "GeneralDentistryWrite")]
    public async Task<ActionResult<DentalChartDto>> UpsertDentalChart(
        Guid patientId, UpsertDentalChartRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var chart = await _generalDentistryService.UpsertDentalChartAsync(patientId, request, userId!);
        return Ok(chart);
    }

    [HttpPut("dental-chart/{chartId:guid}/tooth/{toothNumber}")]
    [Authorize(Policy = "GeneralDentistryWrite")]
    public async Task<ActionResult<ToothConditionDto>> UpdateToothCondition(
        Guid chartId, int toothNumber, UpdateToothConditionRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var tooth = await _generalDentistryService.UpdateToothConditionAsync(chartId, toothNumber, request, userId!);
        if (tooth is null) return NotFound(new { message = "حالة السن غير موجودة" });
        return Ok(tooth);
    }

    // ─── General Treatments ───────────────────────────────────────────

    [HttpGet("treatments/{patientId:guid}")]
    [Authorize(Policy = "GeneralDentistryRead")]
    public async Task<ActionResult> GetGeneralTreatments(
        Guid patientId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _generalDentistryService.GetGeneralTreatmentsAsync(patientId, page, pageSize);
        return Ok(result);
    }

    [HttpPost("treatments")]
    [Authorize(Policy = "GeneralDentistryWrite")]
    public async Task<ActionResult<GeneralTreatmentDto>> CreateGeneralTreatment(
        CreateGeneralTreatmentRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var treatment = await _generalDentistryService.CreateGeneralTreatmentAsync(request, userId!);
        return CreatedAtAction(nameof(GetGeneralTreatments),
            new { patientId = treatment.PatientId }, treatment);
    }

    // ─── Treatment Plan ───────────────────────────────────────────────

    [HttpGet("treatment-plan/{patientId:guid}")]
    [Authorize(Policy = "GeneralDentistryRead")]
    public async Task<ActionResult<List<TreatmentPlanStepDto>>> GetTreatmentPlan(Guid patientId)
    {
        var steps = await _generalDentistryService.GetTreatmentPlanAsync(patientId);
        return Ok(steps);
    }

    [HttpPost("treatment-plan")]
    [Authorize(Policy = "GeneralDentistryWrite")]
    public async Task<ActionResult<TreatmentPlanStepDto>> AddTreatmentPlanStep(
        AddTreatmentPlanStepRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var step = await _generalDentistryService.AddTreatmentPlanStepAsync(request, userId!);
        return CreatedAtAction(nameof(GetTreatmentPlan),
            new { patientId = step.PatientId }, step);
    }

    [HttpPut("treatment-plan/{stepId:guid}")]
    [Authorize(Policy = "GeneralDentistryWrite")]
    public async Task<ActionResult<TreatmentPlanStepDto>> UpdateTreatmentPlanStep(
        Guid stepId, UpdateTreatmentPlanStepRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var step = await _generalDentistryService.UpdateTreatmentPlanStepAsync(stepId, request, userId!);
        if (step is null) return NotFound(new { message = "خطوة خطة العلاج غير موجودة" });
        return Ok(step);
    }

    [HttpPatch("treatment-plan/{stepId:guid}/status")]
    [Authorize(Policy = "GeneralDentistryWrite")]
    public async Task<ActionResult<TreatmentPlanStepDto>> UpdateTreatmentStepStatus(
        Guid stepId, UpdateTreatmentStepStatusRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var step = await _generalDentistryService.UpdateTreatmentStepStatusAsync(stepId, request, userId!);
        if (step is null) return NotFound(new { message = "خطوة خطة العلاج غير موجودة" });
        return Ok(step);
    }
}
