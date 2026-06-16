using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _service;

    public SuppliersController(ISupplierService service) => _service = service;

    [HttpGet]
    [Authorize(Policy = "SupplierRead")]
    public async Task<ActionResult> GetSuppliers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        var result = await _service.GetSuppliersAsync(page, pageSize, search);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "SupplierRead")]
    public async Task<ActionResult<SupplierDto>> GetSupplier(Guid id)
    {
        var supplier = await _service.GetSupplierByIdAsync(id);
        if (supplier is null) return NotFound(new { message = "Supplier not found" });
        return Ok(supplier);
    }

    [HttpPost]
    [Authorize(Policy = "SupplierWrite")]
    public async Task<ActionResult<SupplierDto>> CreateSupplier(CreateSupplierRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var supplier = await _service.CreateSupplierAsync(request, userId!);
        return CreatedAtAction(nameof(GetSupplier), new { id = supplier.Id }, supplier);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "SupplierWrite")]
    public async Task<ActionResult<SupplierDto>> UpdateSupplier(Guid id, UpdateSupplierRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var supplier = await _service.UpdateSupplierAsync(id, request, userId!);
        if (supplier is null) return NotFound(new { message = "Supplier not found" });
        return Ok(supplier);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "SupplierWrite")]
    public async Task<ActionResult> DeleteSupplier(Guid id)
    {
        var result = await _service.DeleteSupplierAsync(id);
        if (!result) return NotFound(new { message = "Supplier not found" });
        return NoContent();
    }

    [HttpGet("{id:guid}/statement")]
    [Authorize(Policy = "SupplierRead")]
    public async Task<ActionResult<SupplierStatementDto>> GetSupplierStatement(Guid id)
    {
        var statement = await _service.GetSupplierStatementAsync(id);
        return Ok(statement);
    }
}
