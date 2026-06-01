using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/journal-entries")]
public class JournalEntriesController : ControllerBase
{
    private readonly IJournalEntryService _service;

    public JournalEntriesController(IJournalEntryService service) => _service = service;

    [HttpGet]
    [Authorize(Policy = "JournalRead")]
    public async Task<ActionResult> GetJournalEntries(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? documentType = null,
        [FromQuery] Guid? branchId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _service.GetEntriesAsync(page, pageSize, documentType, branchId, fromDate, toDate);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "JournalRead")]
    public async Task<ActionResult<JournalEntryDto>> GetJournalEntry(Guid id)
    {
        var entry = await _service.GetByIdAsync(id);
        if (entry is null) return NotFound(new { message = "Journal entry not found" });
        return Ok(entry);
    }

    [HttpPost]
    [Authorize(Policy = "FinanceWrite")]
    public async Task<ActionResult<JournalEntryDto>> CreateJournalEntry(CreateJournalEntryRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var entry = await _service.CreateEntryAsync(request, userId!);
        return CreatedAtAction(nameof(GetJournalEntry), new { id = entry.Id }, entry);
    }
}
