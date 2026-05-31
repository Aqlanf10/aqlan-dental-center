using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/ortho-cases")]
public class OrthodonticsController : ControllerBase
{
    private readonly IOrthodonticsService _orthodonticsService;

    public OrthodonticsController(IOrthodonticsService orthodonticsService)
    {
        _orthodonticsService = orthodonticsService;
    }

    // ─── OrthoCase ───────────────────────────────────────────────────

    [HttpGet]
    [Authorize(Policy = "OrthodonticsRead")]
    public async Task<ActionResult> GetOrthoCases(
        [FromQuery] Guid? patientId,
        [FromQuery] int? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _orthodonticsService.GetOrthoCasesAsync(patientId, status, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "OrthodonticsRead")]
    public async Task<ActionResult<OrthoCaseDto>> GetOrthoCase(Guid id)
    {
        var orthoCase = await _orthodonticsService.GetOrthoCaseByIdAsync(id);
        if (orthoCase is null) return NotFound(new { message = "حالة التقويم غير موجودة" });
        return Ok(orthoCase);
    }

    [HttpPost]
    [Authorize(Policy = "OrthodonticsWrite")]
    public async Task<ActionResult<OrthoCaseDto>> CreateOrthoCase(CreateOrthoCaseRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var orthoCase = await _orthodonticsService.CreateOrthoCaseAsync(request, userId!);
        return CreatedAtAction(nameof(GetOrthoCase), new { id = orthoCase.Id }, orthoCase);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "OrthodonticsWrite")]
    public async Task<ActionResult<OrthoCaseDto>> UpdateOrthoCase(
        Guid id, UpdateOrthoCaseRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var orthoCase = await _orthodonticsService.UpdateOrthoCaseAsync(id, request, userId!);
        if (orthoCase is null) return NotFound(new { message = "حالة التقويم غير موجودة" });
        return Ok(orthoCase);
    }

    // ─── OrthoVisit ──────────────────────────────────────────────────

    [HttpPost("{id:guid}/visits")]
    [Authorize(Policy = "OrthodonticsWrite")]
    public async Task<ActionResult<OrthoVisitDto>> AddOrthoVisit(
        Guid id, AddOrthoVisitRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var visit = await _orthodonticsService.AddOrthoVisitAsync(id, request, userId!);
        return CreatedAtAction(nameof(GetOrthoCase), new { id }, visit);
    }

    // ─── TreatmentStage ──────────────────────────────────────────────

    [HttpPatch("stages/{stageId:guid}")]
    [Authorize(Policy = "OrthodonticsWrite")]
    public async Task<ActionResult<TreatmentStageDto>> UpdateTreatmentStage(
        Guid stageId, UpdateTreatmentStageRequest request)
    {
        var stage = await _orthodonticsService.UpdateTreatmentStageAsync(stageId, request, "");
        if (stage is null) return NotFound(new { message = "المرحلة غير موجودة" });
        return Ok(stage);
    }
}
