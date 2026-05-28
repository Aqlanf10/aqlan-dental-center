using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Features.Auth.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IJwtService _jwtService;

    public AuthController(IMediator mediator, IJwtService jwtService)
    {
        _mediator = mediator;
        _jwtService = jwtService;
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
    public async Task<ActionResult> Logout(LogoutRequest request)
    {
        await _jwtService.RevokeRefreshTokenAsync(request.RefreshToken);
        return Ok(new { Message = "تم تسجيل الخروج بنجاح" });
    }
}

public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken, string AccessToken);
public record LogoutRequest(string RefreshToken);
