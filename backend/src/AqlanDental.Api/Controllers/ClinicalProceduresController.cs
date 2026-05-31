using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/clinical-procedures")]
public class ClinicalProceduresController : ControllerBase
{
    private readonly IClinicalProcedureService _clinicalProcedureService;

    public ClinicalProceduresController(IClinicalProcedureService clinicalProcedureService)
    {
        _clinicalProcedureService = clinicalProcedureService;
    }

    [HttpGet("clinical-visits/{clinicalVisitId:guid}")]
    [Authorize(Policy = "ClinicalProceduresRead")]
    public async Task<ActionResult<List<ClinicalProcedureDto>>> GetByClinicalVisit(Guid clinicalVisitId)
    {
        var procedures = await _clinicalProcedureService.GetProceduresByClinicalVisitAsync(clinicalVisitId);
        return Ok(procedures);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "ClinicalProceduresRead")]
    public async Task<ActionResult<ClinicalProcedureDto>> GetById(Guid id)
    {
        var procedure = await _clinicalProcedureService.GetProcedureByIdAsync(id);
        if (procedure is null) return NotFound(new { message = "الإجراء العلاجي غير موجود" });
        return Ok(procedure);
    }

    [HttpPost("clinical-visits/{clinicalVisitId:guid}")]
    [Authorize(Policy = "ClinicalProceduresWrite")]
    public async Task<ActionResult<ClinicalProcedureDto>> Create(
        Guid clinicalVisitId, CreateClinicalProcedureRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var procedure = await _clinicalProcedureService.CreateProcedureAsync(clinicalVisitId, request, userId!);
        return CreatedAtAction(nameof(GetById), new { id = procedure.Id }, procedure);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "ClinicalProceduresWrite")]
    public async Task<ActionResult<ClinicalProcedureDto>> Update(
        Guid id, UpdateClinicalProcedureRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var procedure = await _clinicalProcedureService.UpdateProcedureAsync(id, request, userId!);
        if (procedure is null) return NotFound(new { message = "الإجراء العلاجي غير موجود" });
        return Ok(procedure);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "ClinicalProceduresWrite")]
    public async Task<ActionResult<ClinicalProcedureDto>> UpdateStatus(
        Guid id, UpdateClinicalProcedureStatusRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var procedure = await _clinicalProcedureService.UpdateProcedureStatusAsync(id, request, userId!);
        if (procedure is null) return NotFound(new { message = "الإجراء العلاجي غير موجود" });
        return Ok(procedure);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "ClinicalProceduresWrite")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var deleted = await _clinicalProcedureService.DeleteProcedureAsync(id, userId!);
        if (!deleted) return NotFound(new { message = "الإجراء العلاجي غير موجود" });
        return NoContent();
    }
}
