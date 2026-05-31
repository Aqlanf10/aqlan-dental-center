using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/clinical-photos")]
public class ClinicalPhotosController : ControllerBase
{
    private readonly IClinicalPhotoService _service;
    private readonly IWebHostEnvironment _env;

    public ClinicalPhotosController(IClinicalPhotoService service, IWebHostEnvironment env)
    {
        _service = service;
        _env = env;
    }

    [HttpGet("patient/{patientId:guid}")]
    [Authorize(Policy = "PatientRead")]
    public async Task<ActionResult> GetPhotosForPatient(Guid patientId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] int? category = null)
    {
        var photos = await _service.GetPhotosByPatientAsync(patientId, page, pageSize, category);
        return Ok(photos);
    }

    [HttpPost("patient/{patientId:guid}")]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult<ClinicalPhotoDto>> UploadPhoto(Guid patientId, IFormFile file,
        [FromForm] int category, [FromForm] Guid? orthoCaseId, [FromForm] string? photoType,
        [FromForm] string? stage, [FromForm] DateTime? photoDate, [FromForm] string? caption)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        var uploadsDir = Path.Combine(_env.ContentRootPath, "..", "..", "uploads", "clinical-photos", patientId.ToString());
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        var relativePath = $"uploads/clinical-photos/{patientId}/{fileName}";
        var request = new UploadClinicalPhotoRequest(patientId, orthoCaseId, relativePath,
            ThumbnailUrl: null, category, photoType, stage, photoDate, caption);

        var photo = await _service.UploadPhotoAsync(request);
        return CreatedAtAction(nameof(GetPhotosForPatient), new { patientId }, photo);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult> DeletePhoto(Guid id)
    {
        var result = await _service.DeletePhotoAsync(id);
        if (!result) return NotFound(new { message = "Photo not found" });
        return NoContent();
    }
}
