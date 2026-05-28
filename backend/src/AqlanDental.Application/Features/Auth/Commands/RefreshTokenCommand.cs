using AqlanDental.Application.Common.Interfaces;
using MediatR;

namespace AqlanDental.Application.Features.Auth.Commands;

public record RefreshTokenCommand(string RefreshToken, string AccessToken) : IRequest<AuthResult>;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResult>
{
    private readonly IJwtService _jwtService;

    public RefreshTokenCommandHandler(IJwtService jwtService)
    {
        _jwtService = jwtService;
    }

    public async Task<AuthResult> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var result = await _jwtService.RefreshTokenAsync(request.RefreshToken, request.AccessToken);
        return result;
    }
}
