using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DoctorsController : ControllerBase
{
    private readonly IDoctorService _doctorService;

    public DoctorsController(IDoctorService doctorService)
    {
        _doctorService = doctorService;
    }

    [HttpGet]
    [Authorize(Policy = "DoctorRead")]
    public async Task<ActionResult<PagedResult<DoctorDto>>> GetDoctors(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null)
    {
        var result = await _doctorService.GetDoctorsAsync(page, pageSize, search);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "DoctorRead")]
    public async Task<ActionResult<DoctorDto>> GetDoctor(Guid id)
    {
        var doctor = await _doctorService.GetDoctorByIdAsync(id);
        if (doctor is null) return NotFound(new { message = "الطبيب غير موجود" });
        return Ok(doctor);
    }

    [HttpPost]
    [Authorize(Policy = "DoctorWrite")]
    public async Task<ActionResult<DoctorDto>> CreateDoctor(CreateDoctorRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var doctor = await _doctorService.CreateDoctorAsync(request, userId!);
        return CreatedAtAction(nameof(GetDoctor), new { id = doctor.Id }, doctor);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "DoctorWrite")]
    public async Task<ActionResult<DoctorDto>> UpdateDoctor(Guid id, UpdateDoctorRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var doctor = await _doctorService.UpdateDoctorAsync(id, request, userId!);
        if (doctor is null) return NotFound(new { message = "الطبيب غير موجود" });
        return Ok(doctor);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "DoctorDelete")]
    public async Task<ActionResult> DeleteDoctor(Guid id)
    {
        var result = await _doctorService.SoftDeleteDoctorAsync(id);
        if (!result) return NotFound(new { message = "الطبيب غير موجود" });
        return Ok(new { message = "تم حذف الطبيب بنجاح" });
    }
}
