namespace AqlanDental.Application.Common.Interfaces;

public record AuthResult(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    string UserId,
    string FullName,
    IList<string> Roles,
    bool MustChangePassword = false
);

public interface IJwtService
{
    Task<AuthResult> GenerateTokensAsync(string userId, string fullName, IList<string> roles, bool mustChangePassword = false);
    Task<AuthResult> RefreshTokenAsync(string refreshToken, string accessToken);
    Task RevokeRefreshTokenAsync(string refreshToken);
}
