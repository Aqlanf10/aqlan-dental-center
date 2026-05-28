using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly IPatientService _patientService;

    public PatientsController(IPatientService patientService)
    {
        _patientService = patientService;
    }

    [HttpGet]
    [Authorize(Policy = "PatientRead")]
    public async Task<ActionResult<PagedResult<PatientDto>>> GetPatients(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null)
    {
        var result = await _patientService.GetPatientsAsync(page, pageSize, search);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "PatientRead")]
    public async Task<ActionResult<PatientDto>> GetPatient(Guid id)
    {
        var patient = await _patientService.GetPatientByIdAsync(id);
        if (patient is null) return NotFound(new { message = "المريض غير موجود" });
        return Ok(patient);
    }

    [HttpPost]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult<PatientDto>> CreatePatient(CreatePatientRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var patient = await _patientService.CreatePatientAsync(request, userId!);
        return CreatedAtAction(nameof(GetPatient), new { id = patient.Id }, patient);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult<PatientDto>> UpdatePatient(Guid id, UpdatePatientRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var patient = await _patientService.UpdatePatientAsync(id, request, userId!);
        if (patient is null) return NotFound(new { message = "المريض غير موجود" });
        return Ok(patient);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "PatientDelete")]
    public async Task<ActionResult> DeletePatient(Guid id)
    {
        var result = await _patientService.SoftDeletePatientAsync(id);
        if (!result) return NotFound(new { message = "المريض غير موجود" });
        return Ok(new { message = "تم حذف المريض بنجاح" });
    }
}
