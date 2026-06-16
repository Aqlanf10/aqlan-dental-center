using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/radiographs")]
public class RadiographsController : ControllerBase
{
    private readonly IClinicalPhotoService _service;
    private readonly IWebHostEnvironment _env;

    public RadiographsController(IClinicalPhotoService service, IWebHostEnvironment env)
    {
        _service = service;
        _env = env;
    }

    [HttpGet("patient/{patientId:guid}")]
    [Authorize(Policy = "PatientRead")]
    public async Task<ActionResult> GetRadiographsForPatient(Guid patientId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] int? xrayType = null)
    {
        var radiographs = await _service.GetRadiographsByPatientAsync(patientId, page, pageSize, xrayType);
        return Ok(radiographs);
    }

    [HttpPost("patient/{patientId:guid}")]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult<RadiographDto>> UploadRadiograph(Guid patientId, IFormFile file,
        [FromForm] int xrayType, [FromForm] string? toothRelated, [FromForm] Guid? doctorId,
        [FromForm] DateTime? xrayDate, [FromForm] string? notes)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        var uploadsDir = Path.Combine(_env.ContentRootPath, "..", "..", "uploads", "radiographs", patientId.ToString());
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        var relativePath = $"uploads/radiographs/{patientId}/{fileName}";
        var request = new UploadRadiographRequest(patientId, relativePath, xrayType,
            file.FileName, file.Length, file.ContentType, toothRelated, doctorId, xrayDate, notes);

        var radiograph = await _service.UploadRadiographAsync(request);
        return CreatedAtAction(nameof(GetRadiographsForPatient), new { patientId }, radiograph);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult> DeleteRadiograph(Guid id)
    {
        var result = await _service.DeleteRadiographAsync(id);
        if (!result) return NotFound(new { message = "Radiograph not found" });
        return NoContent();
    }
}
