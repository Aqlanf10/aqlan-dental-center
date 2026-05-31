using AqlanDental.Application.Common.Interfaces;
using MediatR;

namespace AqlanDental.Application.Features.Auth.Commands;

public record ChangePasswordCommand(string UserId, string CurrentPassword, string NewPassword) : IRequest<ChangePasswordResult>;

public record ChangePasswordResult(bool Success, string? AccessToken, string? Message);

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, ChangePasswordResult>
{
    private readonly IUserService _userService;
    private readonly IJwtService _jwtService;

    public ChangePasswordCommandHandler(IUserService userService, IJwtService jwtService)
    {
        _userService = userService;
        _jwtService = jwtService;
    }

    public async Task<ChangePasswordResult> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var result = await _userService.ChangePasswordAsync(request.UserId, request.CurrentPassword, request.NewPassword);

        if (!result.Success)
        {
            return new ChangePasswordResult(false, null, result.Message);
        }

        var user = await _userService.GetUserByIdAsync(request.UserId);
        if (user is null)
        {
            return new ChangePasswordResult(false, null, "لم يتم العثور على المستخدم");
        }

        var authResult = await _jwtService.GenerateTokensAsync(user.UserId, user.FullName, user.Roles);

        return new ChangePasswordResult(true, authResult.AccessToken, "تم تغيير كلمة المرور بنجاح");
    }
}
