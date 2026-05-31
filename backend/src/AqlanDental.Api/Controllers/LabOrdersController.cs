using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/lab-orders")]
public class LabOrdersController : ControllerBase
{
    private readonly ILabOrderService _labOrderService;

    public LabOrdersController(ILabOrderService labOrderService)
    {
        _labOrderService = labOrderService;
    }

    [HttpGet]
    [Authorize(Policy = "LabOrdersRead")]
    public async Task<ActionResult> GetLabOrders(
        [FromQuery] Guid? patientId,
        [FromQuery] int? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _labOrderService.GetLabOrdersAsync(patientId, status, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "LabOrdersRead")]
    public async Task<ActionResult<LabOrderDto>> GetLabOrder(Guid id)
    {
        var labOrder = await _labOrderService.GetLabOrderByIdAsync(id);
        if (labOrder is null) return NotFound(new { message = "طلب المختبر غير موجود" });
        return Ok(labOrder);
    }

    [HttpPost]
    [Authorize(Policy = "LabOrdersWrite")]
    public async Task<ActionResult<LabOrderDto>> CreateLabOrder(CreateLabOrderRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var labOrder = await _labOrderService.CreateLabOrderAsync(request, userId!);
        return CreatedAtAction(nameof(GetLabOrder), new { id = labOrder.Id }, labOrder);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "LabOrdersWrite")]
    public async Task<ActionResult<LabOrderDto>> UpdateLabOrder(
        Guid id, UpdateLabOrderRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var labOrder = await _labOrderService.UpdateLabOrderAsync(id, request, userId!);
        if (labOrder is null) return NotFound(new { message = "طلب المختبر غير موجود" });
        return Ok(labOrder);
    }
}
