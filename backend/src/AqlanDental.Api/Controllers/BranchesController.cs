using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/branches")]
public class BranchesController : ControllerBase
{
    private readonly IBranchService _branchService;

    public BranchesController(IBranchService branchService)
    {
        _branchService = branchService;
    }

    [HttpGet]
    [Authorize(Policy = "BranchesRead")]
    public async Task<ActionResult> GetBranches()
    {
        var result = await _branchService.GetBranchesAsync();
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "BranchesRead")]
    public async Task<ActionResult<BranchDto>> GetBranch(Guid id)
    {
        var branch = await _branchService.GetBranchByIdAsync(id);
        if (branch is null) return NotFound(new { message = "الفرع غير موجود" });
        return Ok(branch);
    }

    [HttpPost]
    [Authorize(Policy = "BranchesWrite")]
    public async Task<ActionResult<BranchDto>> CreateBranch(CreateBranchRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var branch = await _branchService.CreateBranchAsync(request, userId!);
        return CreatedAtAction(nameof(GetBranch), new { id = branch.Id }, branch);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "BranchesWrite")]
    public async Task<ActionResult<BranchDto>> UpdateBranch(
        Guid id, UpdateBranchRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var branch = await _branchService.UpdateBranchAsync(id, request, userId!);
        if (branch is null) return NotFound(new { message = "الفرع غير موجود" });
        return Ok(branch);
    }
}
