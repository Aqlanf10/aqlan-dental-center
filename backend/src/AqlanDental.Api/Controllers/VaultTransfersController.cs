using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/vault-transfers")]
public class VaultTransfersController : ControllerBase
{
    private readonly IVaultTransferService _service;

    public VaultTransfersController(IVaultTransferService service) => _service = service;

    [HttpGet]
    [Authorize(Policy = "VaultTransferRead")]
    public async Task<ActionResult> GetVaultTransfers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? status = null)
    {
        var result = await _service.GetAllAsync(page, pageSize, status);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "VaultTransferRead")]
    public async Task<ActionResult<VaultTransferDto>> GetVaultTransfer(Guid id)
    {
        var transfer = await _service.GetByIdAsync(id);
        if (transfer is null) return NotFound(new { message = "Vault transfer not found" });
        return Ok(transfer);
    }

    [HttpPost]
    [Authorize(Policy = "VaultTransferWrite")]
    public async Task<ActionResult<VaultTransferDto>> CreateVaultTransfer(CreateVaultTransferRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var transfer = await _service.CreateAsync(request, userId!);
        return CreatedAtAction(nameof(GetVaultTransfer), new { id = transfer.Id }, transfer);
    }

    [HttpPut("{id:guid}/approve")]
    [Authorize(Policy = "VaultTransferApprove")]
    public async Task<ActionResult<VaultTransferDto>> ApproveVaultTransfer(Guid id, ApproveVaultTransferRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var transfer = await _service.ApproveAsync(id, request, userId!);
        if (transfer is null) return NotFound(new { message = "Vault transfer not found" });
        return Ok(transfer);
    }

    [HttpPut("{id:guid}/reject")]
    [Authorize(Policy = "VaultTransferApprove")]
    public async Task<ActionResult<VaultTransferDto>> RejectVaultTransfer(Guid id, RejectVaultTransferRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var transfer = await _service.RejectAsync(id, request, userId!);
        if (transfer is null) return NotFound(new { message = "Vault transfer not found" });
        return Ok(transfer);
    }
}
