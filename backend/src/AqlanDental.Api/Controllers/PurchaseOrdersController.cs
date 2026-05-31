using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/purchase-orders")]
public class PurchaseOrdersController : ControllerBase
{
    private readonly ISupplierService _service;

    public PurchaseOrdersController(ISupplierService service) => _service = service;

    [HttpGet]
    [Authorize(Policy = "SupplierRead")]
    public async Task<ActionResult> GetPurchaseOrders(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? supplierId = null,
        [FromQuery] int? status = null)
    {
        var result = await _service.GetPurchaseOrdersAsync(page, pageSize, supplierId, status);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "SupplierRead")]
    public async Task<ActionResult<PurchaseOrderDto>> GetPurchaseOrder(Guid id)
    {
        var order = await _service.GetPurchaseOrderByIdAsync(id);
        if (order is null) return NotFound(new { message = "Purchase order not found" });
        return Ok(order);
    }

    [HttpPost]
    [Authorize(Policy = "SupplierWrite")]
    public async Task<ActionResult<PurchaseOrderDto>> CreatePurchaseOrder(CreatePurchaseOrderRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var order = await _service.CreatePurchaseOrderAsync(request, userId!);
        return CreatedAtAction(nameof(GetPurchaseOrder), new { id = order.Id }, order);
    }
}
