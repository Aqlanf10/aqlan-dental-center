using AqlanDental.Application.Common.Interfaces;
using MediatR;

namespace AqlanDental.Application.Features.Auth.Commands;

public record LoginCommand(string Email, string Password) : IRequest<AuthResult>;

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResult>
{
    private readonly IUserService _userService;
    private readonly IJwtService _jwtService;

    public LoginCommandHandler(IUserService userService, IJwtService jwtService)
    {
        _userService = userService;
        _jwtService = jwtService;
    }

    public async Task<AuthResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _userService.ValidateCredentialsAsync(request.Email, request.Password);

        if (user is null)
        {
            throw new UnauthorizedAccessException("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("هذا الحساب معطل. يرجى التواصل مع الإدارة");
        }

        var authResult = await _jwtService.GenerateTokensAsync(
            user.UserId, user.FullName, user.Roles, user.MustChangePassword);

        await _userService.UpdateLastLoginAsync(user.UserId);

        return authResult with { MustChangePassword = user.MustChangePassword };
    }
}
