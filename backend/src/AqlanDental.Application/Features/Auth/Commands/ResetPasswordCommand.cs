using AqlanDental.Application.Common.Interfaces;
using MediatR;

namespace AqlanDental.Application.Features.Auth.Commands;

public record ResetPasswordCommand(string Token, string NewPassword) : IRequest<ResetPasswordResult>;

public record ResetPasswordResult(bool Success, string Message);

public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, ResetPasswordResult>
{
    private readonly IUserService _userService;

    public ResetPasswordCommandHandler(IUserService userService)
    {
        _userService = userService;
    }

    public async Task<ResetPasswordResult> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var result = await _userService.ResetPasswordAsync(request.Token, request.NewPassword);

        if (!result.Success)
        {
            return new ResetPasswordResult(false, result.Message);
        }

        return new ResetPasswordResult(true, "تم إعادة تعيين كلمة المرور بنجاح");
    }
}
