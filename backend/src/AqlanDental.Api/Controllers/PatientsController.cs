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

    [HttpGet("{id:guid}/summary")]
    [Authorize(Policy = "PatientRead")]
    public async Task<ActionResult<PatientSummaryDto>> GetPatientSummary(Guid id)
    {
        var summary = await _patientService.GetPatientSummaryAsync(id);
        if (summary is null) return NotFound(new { message = "المريض غير موجود" });
        return Ok(summary);
    }

    [HttpGet("{id:guid}/timeline")]
    [Authorize(Policy = "PatientRead")]
    public async Task<ActionResult<PatientTimelineDto>> GetPatientTimeline(Guid id)
    {
        var timeline = await _patientService.GetPatientTimelineAsync(id);
        return Ok(timeline);
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

    [HttpGet("{id:guid}/medical-history")]
    [Authorize(Policy = "PatientRead")]
    public async Task<ActionResult<MedicalHistoryDto>> GetMedicalHistory(Guid id)
    {
        var medicalHistory = await _patientService.GetMedicalHistoryAsync(id);
        return Ok(medicalHistory);
    }

    [HttpPut("{id:guid}/medical-history")]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult<MedicalHistoryDto>> UpsertMedicalHistory(Guid id, UpsertMedicalHistoryRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var medicalHistory = await _patientService.UpsertMedicalHistoryAsync(id, request, userId!);
        return Ok(medicalHistory);
    }

    [HttpGet("{id:guid}/dental-history")]
    [Authorize(Policy = "PatientRead")]
    public async Task<ActionResult<DentalHistoryDto>> GetDentalHistory(Guid id)
    {
        var dentalHistory = await _patientService.GetDentalHistoryAsync(id);
        return Ok(dentalHistory);
    }

    [HttpPut("{id:guid}/dental-history")]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult<DentalHistoryDto>> UpsertDentalHistory(Guid id, UpsertDentalHistoryRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var dentalHistory = await _patientService.UpsertDentalHistoryAsync(id, request, userId!);
        return Ok(dentalHistory);
    }
}
