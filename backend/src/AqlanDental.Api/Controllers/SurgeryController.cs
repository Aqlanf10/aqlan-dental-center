using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/surgery-cases")]
public class SurgeryController : ControllerBase
{
    private readonly ISurgeryService _surgeryService;

    public SurgeryController(ISurgeryService surgeryService)
    {
        _surgeryService = surgeryService;
    }

    // ─── SurgeryCase ─────────────────────────────────────────────────

    [HttpGet]
    [Authorize(Policy = "SurgeryRead")]
    public async Task<ActionResult> GetSurgeryCases(
        [FromQuery] Guid? patientId,
        [FromQuery] int? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _surgeryService.GetSurgeryCasesAsync(patientId, status, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "SurgeryRead")]
    public async Task<ActionResult<SurgeryCaseDto>> GetSurgeryCase(Guid id)
    {
        var surgeryCase = await _surgeryService.GetSurgeryCaseByIdAsync(id);
        if (surgeryCase is null) return NotFound(new { message = "العملية الجراحية غير موجودة" });
        return Ok(surgeryCase);
    }

    [HttpPost]
    [Authorize(Policy = "SurgeryWrite")]
    public async Task<ActionResult<SurgeryCaseDto>> CreateSurgeryCase(CreateSurgeryCaseRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var surgeryCase = await _surgeryService.CreateSurgeryCaseAsync(request, userId!);
        return CreatedAtAction(nameof(GetSurgeryCase), new { id = surgeryCase.Id }, surgeryCase);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "SurgeryWrite")]
    public async Task<ActionResult<SurgeryCaseDto>> UpdateSurgeryCase(
        Guid id, UpdateSurgeryCaseRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var surgeryCase = await _surgeryService.UpdateSurgeryCaseAsync(id, request, userId!);
        if (surgeryCase is null) return NotFound(new { message = "العملية الجراحية غير موجودة" });
        return Ok(surgeryCase);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "SurgeryWrite")]
    public async Task<ActionResult<SurgeryCaseDto>> UpdateSurgeryStatus(
        Guid id, UpdateSurgeryStatusRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var surgeryCase = await _surgeryService.UpdateSurgeryStatusAsync(id, request, userId!);
        if (surgeryCase is null) return NotFound(new { message = "العملية الجراحية غير موجودة" });
        return Ok(surgeryCase);
    }
}
