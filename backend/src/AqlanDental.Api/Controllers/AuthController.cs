using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Features.Auth.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IJwtService _jwtService;
    private readonly IUserService _userService;

    public AuthController(IMediator mediator, IJwtService jwtService, IUserService userService)
    {
        _mediator = mediator;
        _jwtService = jwtService;
        _userService = userService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResult>> Login(LoginRequest request)
    {
        var result = await _mediator.Send(new LoginCommand(request.Email, request.Password));
        return Ok(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResult>> Refresh(RefreshRequest request)
    {
        var result = await _mediator.Send(
            new RefreshTokenCommand(request.RefreshToken, request.AccessToken));
        return Ok(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult> Logout([FromBody] LogoutRequest? request)
    {
        var refreshToken = request?.RefreshToken;

        if (string.IsNullOrEmpty(refreshToken))
        {
            // Revoke all tokens for the user if no specific token provided
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                await _userService.RevokeAllRefreshTokensAsync(userId);
            }
        }
        else
        {
            await _jwtService.RevokeRefreshTokenAsync(refreshToken);
        }

        return Ok(new { Message = "تم تسجيل الخروج بنجاح" });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserInfoResponse>> GetMe()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var user = await _userService.GetUserByIdAsync(userId);
        if (user is null)
        {
            return NotFound(new { Message = "لم يتم العثور على المستخدم" });
        }

        return Ok(new UserInfoResponse
        {
            Id = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            FullNameAr = user.FullNameAr,
            IsActive = user.IsActive,
            MustChangePassword = user.MustChangePassword,
            Roles = user.Roles
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult<ChangePasswordResponse>> ChangePassword(ChangePasswordRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var result = await _mediator.Send(new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword));

        if (!result.Success)
        {
            return BadRequest(new { Message = result.Message });
        }

        return Ok(new ChangePasswordResponse
        {
            Success = true,
            AccessToken = result.AccessToken,
            Message = result.Message
        });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ForgotPasswordResponse>> ForgotPassword(ForgotPasswordRequest request)
    {
        var result = await _mediator.Send(new ForgotPasswordCommand(request.UsernameOrEmail));

        // Always return success to prevent user enumeration
        return Ok(new ForgotPasswordResponse
        {
            Success = true,
            Message = result.Message,
            ResetToken = result.ResetToken // Only available in development
        });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ResetPasswordResponse>> ResetPassword(ResetPasswordRequest request)
    {
        var result = await _mediator.Send(new ResetPasswordCommand(request.Token, request.NewPassword));

        if (!result.Success)
        {
            return BadRequest(new { Message = result.Message });
        }

        return Ok(new ResetPasswordResponse
        {
            Success = true,
            Message = result.Message
        });
    }
}

// ─── Request/Response DTOs ──────────────────────────────────────

public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken, string AccessToken);
public record LogoutRequest(string RefreshToken);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record ForgotPasswordRequest(string UsernameOrEmail);
public record ResetPasswordRequest(string Token, string NewPassword);

public class UserInfoResponse
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? FullNameAr { get; set; }
    public bool IsActive { get; set; }
    public bool MustChangePassword { get; set; }
    public IList<string> Roles { get; set; } = new List<string>();
}

public class ChangePasswordResponse
{
    public bool Success { get; set; }
    public string? AccessToken { get; set; }
    public string? Message { get; set; }
}

public class ForgotPasswordResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? ResetToken { get; set; }
}

public class ResetPasswordResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
