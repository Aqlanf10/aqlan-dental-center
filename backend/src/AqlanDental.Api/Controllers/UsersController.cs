using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;

    public UsersController(IUserManagementService userManagementService)
    {
        _userManagementService = userManagementService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<UserListDto>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null)
    {
        var result = await _userManagementService.GetUsersAsync(page, pageSize, search, role);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserListDto>> GetUser(string id)
    {
        var user = await _userManagementService.GetUserByIdAsync(id);
        if (user is null) return NotFound(new { Message = "لم يتم العثور على المستخدم" });
        return Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserListDto>> CreateUser([FromBody] CreateUserRequest request)
    {
        try
        {
            var user = await _userManagementService.CreateUserAsync(request);
            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UserListDto>> UpdateUser(string id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            var user = await _userManagementService.UpdateUserAsync(id, request);
            if (user is null) return NotFound(new { Message = "لم يتم العثور على المستخدم" });
            return Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult> ToggleStatus(string id)
    {
        try
        {
            var result = await _userManagementService.ToggleUserStatusAsync(id);
            if (!result) return NotFound(new { Message = "لم يتم العثور على المستخدم" });
            return Ok(new { Message = "تم تحديث حالة المستخدم بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteUser(string id)
    {
        try
        {
            var result = await _userManagementService.SoftDeleteUserAsync(id);
            if (!result) return NotFound(new { Message = "لم يتم العثور على المستخدم" });
            return Ok(new { Message = "تم حذف المستخدم بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult> RestoreUser(string id)
    {
        var result = await _userManagementService.RestoreUserAsync(id);
        if (!result) return NotFound(new { Message = "لم يتم العثور على المستخدم" });
        return Ok(new { Message = "تم استعادة المستخدم بنجاح" });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<ActionResult> AdminResetPassword(string id)
    {
        var result = await _userManagementService.AdminResetPasswordAsync(id);
        if (!result.Success) return BadRequest(new { Message = result.Message });
        return Ok(new { Message = result.Message, TempPassword = result.TempPassword });
    }
}
