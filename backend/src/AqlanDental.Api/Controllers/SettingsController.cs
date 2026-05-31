using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly IClinicServiceService _service;

    public SettingsController(IClinicServiceService service)
    {
        _service = service;
    }

    // ─── Settings ────────────────────────────────────────────────

    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<List<SettingDto>>> GetAllSettings()
    {
        var settings = await _service.GetAllSettingsAsync();
        return Ok(settings);
    }

    [HttpPut("{key}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<SettingDto>> UpsertSetting(string key, UpsertSettingRequest request)
    {
        var setting = await _service.UpsertSettingAsync(key, request);
        return Ok(setting);
    }

    // ─── Clinic Services ─────────────────────────────────────────

    [HttpGet("services")]
    [Authorize(Policy = "ClinicServicesRead")]
    public async Task<ActionResult<PagedResult<ClinicServiceDto>>> GetClinicServices(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] int? category = null,
        [FromQuery] bool includeInactive = false)
    {
        var result = await _service.GetClinicServicesAsync(page, pageSize, search, category, includeInactive);
        return Ok(result);
    }

    [HttpGet("services/active")]
    [Authorize(Policy = "ReceptionOrAbove")]
    public async Task<ActionResult<PagedResult<ClinicServiceDto>>> GetActiveClinicServices(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] int? category = null)
    {
        var result = await _service.GetClinicServicesAsync(page, pageSize, search, category, includeInactive: false);
        return Ok(result);
    }

    [HttpPost("services")]
    [Authorize(Policy = "ClinicServicesWrite")]
    public async Task<ActionResult<ClinicServiceDto>> CreateClinicService(CreateClinicServiceRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var service = await _service.CreateClinicServiceAsync(request, userId!);
        return CreatedAtAction(nameof(GetClinicServiceById), new { id = service.Id }, service);
    }

    [HttpGet("services/{id:guid}")]
    [Authorize(Policy = "ClinicServicesRead")]
    public async Task<ActionResult<ClinicServiceDto>> GetClinicServiceById(Guid id)
    {
        var service = await _service.GetClinicServiceByIdAsync(id);
        if (service is null) return NotFound(new { message = "الخدمة غير موجودة" });
        return Ok(service);
    }

    [HttpPut("services/{id:guid}")]
    [Authorize(Policy = "ClinicServicesWrite")]
    public async Task<ActionResult<ClinicServiceDto>> UpdateClinicService(Guid id, UpdateClinicServiceRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var service = await _service.UpdateClinicServiceAsync(id, request, userId!);
        if (service is null) return NotFound(new { message = "الخدمة غير موجودة" });
        return Ok(service);
    }

    [HttpPatch("services/{id:guid}/activate")]
    [Authorize(Policy = "ClinicServicesWrite")]
    public async Task<ActionResult> ActivateClinicService(Guid id)
    {
        var result = await _service.ActivateClinicServiceAsync(id);
        if (!result) return NotFound(new { message = "الخدمة غير موجودة أو مفعلة بالفعل" });
        return Ok(new { message = "تم تفعيل الخدمة بنجاح" });
    }

    [HttpPatch("services/{id:guid}/deactivate")]
    [Authorize(Policy = "ClinicServicesWrite")]
    public async Task<ActionResult> DeactivateClinicService(Guid id)
    {
        var result = await _service.DeactivateClinicServiceAsync(id);
        if (!result) return NotFound(new { message = "الخدمة غير موجودة أو معطلة بالفعل" });
        return Ok(new { message = "تم تعطيل الخدمة بنجاح" });
    }
}
