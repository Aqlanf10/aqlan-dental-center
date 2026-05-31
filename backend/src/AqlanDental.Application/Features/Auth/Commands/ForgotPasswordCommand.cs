using AqlanDental.Application.Common.Interfaces;
using MediatR;

namespace AqlanDental.Application.Features.Auth.Commands;

public record ForgotPasswordCommand(string UsernameOrEmail) : IRequest<ForgotPasswordResult>;

public record ForgotPasswordResult(bool Success, string Message, string? ResetToken = null);

public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, ForgotPasswordResult>
{
    private readonly IUserService _userService;

    public ForgotPasswordCommandHandler(IUserService userService)
    {
        _userService = userService;
    }

    public async Task<ForgotPasswordResult> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var result = await _userService.GeneratePasswordResetTokenAsync(request.UsernameOrEmail);

        // Always return same message to prevent user enumeration
        if (!result.Success)
        {
            // Even if user not found, return success message
            return new ForgotPasswordResult(true, "إذا كان الحساب موجوداً، سيتم إرسال رابط إعادة تعيين كلمة المرور");
        }

        // In production, send email with reset link containing the token
        // For now, return the token directly (development mode)
        return new ForgotPasswordResult(true, "إذا كان الحساب موجوداً، سيتم إرسال رابط إعادة تعيين كلمة المرور", result.ResetToken);
    }
}
