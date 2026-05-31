using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/inventory")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult> GetInventoryItems(
        [FromQuery] string? category,
        [FromQuery] bool? lowStock,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _inventoryService.GetInventoryItemsAsync(category, lowStock, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<InventoryItemDto>> GetInventoryItem(Guid id)
    {
        var item = await _inventoryService.GetInventoryItemByIdAsync(id);
        if (item is null) return NotFound(new { message = "المادة غير موجودة" });
        return Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = "InventoryWrite")]
    public async Task<ActionResult<InventoryItemDto>> CreateInventoryItem(CreateInventoryItemRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var item = await _inventoryService.CreateInventoryItemAsync(request, userId!);
        return CreatedAtAction(nameof(GetInventoryItem), new { id = item.Id }, item);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "InventoryWrite")]
    public async Task<ActionResult<InventoryItemDto>> UpdateInventoryItem(
        Guid id, UpdateInventoryItemRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var item = await _inventoryService.UpdateInventoryItemAsync(id, request, userId!);
        if (item is null) return NotFound(new { message = "المادة غير موجودة" });
        return Ok(item);
    }
}
