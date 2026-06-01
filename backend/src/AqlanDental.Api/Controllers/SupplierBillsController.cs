using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/supplier-bills")]
public class SupplierBillsController : ControllerBase
{
    private readonly ISupplierService _service;

    public SupplierBillsController(ISupplierService service) => _service = service;

    [HttpGet]
    [Authorize(Policy = "SupplierRead")]
    public async Task<ActionResult> GetSupplierBills(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? supplierId = null,
        [FromQuery] int? status = null)
    {
        var result = await _service.GetSupplierBillsAsync(page, pageSize, supplierId, status);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "SupplierRead")]
    public async Task<ActionResult<SupplierBillDto>> GetSupplierBill(Guid id)
    {
        var bill = await _service.GetSupplierBillByIdAsync(id);
        if (bill is null) return NotFound(new { message = "Supplier bill not found" });
        return Ok(bill);
    }

    [HttpPost]
    [Authorize(Policy = "SupplierWrite")]
    public async Task<ActionResult<SupplierBillDto>> CreateSupplierBill(CreateSupplierBillRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var bill = await _service.CreateSupplierBillAsync(request, userId!);
        return CreatedAtAction(nameof(GetSupplierBill), new { id = bill.Id }, bill);
    }

    [HttpPost("{id:guid}/pay")]
    [Authorize(Policy = "SupplierWrite")]
    public async Task<ActionResult<SupplierBillPaymentDto>> PaySupplierBill(Guid id, CreateSupplierBillPaymentRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var payment = await _service.CreateSupplierBillPaymentAsync(id, request, userId!);
        return Ok(payment);
    }
}
