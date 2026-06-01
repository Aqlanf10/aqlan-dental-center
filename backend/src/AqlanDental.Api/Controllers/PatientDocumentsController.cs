using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/patient-documents")]
public class PatientDocumentsController : ControllerBase
{
    private readonly IClinicalPhotoService _service;
    private readonly IWebHostEnvironment _env;

    public PatientDocumentsController(IClinicalPhotoService service, IWebHostEnvironment env)
    {
        _service = service;
        _env = env;
    }

    [HttpGet("patient/{patientId:guid}")]
    [Authorize(Policy = "PatientRead")]
    public async Task<ActionResult> GetDocumentsForPatient(Guid patientId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] int? documentType = null)
    {
        var documents = await _service.GetDocumentsByPatientAsync(patientId, page, pageSize, documentType);
        return Ok(documents);
    }

    [HttpPost("patient/{patientId:guid}")]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult<PatientDocumentDto>> UploadDocument(Guid patientId, IFormFile file,
        [FromForm] string title, [FromForm] int documentType, [FromForm] string? notes)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        var uploadsDir = Path.Combine(_env.ContentRootPath, "..", "..", "uploads", "patient-documents", patientId.ToString());
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        var relativePath = $"uploads/patient-documents/{patientId}/{fileName}";
        var request = new UploadPatientDocumentRequest(patientId, title, documentType, relativePath,
            file.FileName, file.Length, file.ContentType, IsSigned: false, notes);

        var document = await _service.UploadDocumentAsync(request);
        return CreatedAtAction(nameof(GetDocumentsForPatient), new { patientId }, document);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "PatientWrite")]
    public async Task<ActionResult> DeleteDocument(Guid id)
    {
        var result = await _service.DeleteDocumentAsync(id);
        if (!result) return NotFound(new { message = "Document not found" });
        return NoContent();
    }
}
