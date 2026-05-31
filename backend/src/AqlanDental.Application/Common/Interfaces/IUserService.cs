namespace AqlanDental.Application.Common.Interfaces;

public record UserInfo(
    string UserId,
    string Email,
    string FullName,
    string? FullNameAr,
    bool IsActive,
    bool MustChangePassword,
    IList<string> Roles
);

public record ChangePasswordResult(bool Success, string? Message);
public record GenerateResetTokenResult(bool Success, string? ResetToken, string? Message);
public record ResetPasswordResult(bool Success, string? Message = null);

public interface IUserService
{
    Task<UserInfo?> ValidateCredentialsAsync(string email, string password);
    Task UpdateLastLoginAsync(string userId);
    Task<UserInfo?> GetUserByIdAsync(string userId);
    Task<IList<string>> GetUserRolesAsync(string userId);
    Task<ChangePasswordResult> ChangePasswordAsync(string userId, string currentPassword, string newPassword);
    Task<GenerateResetTokenResult> GeneratePasswordResetTokenAsync(string usernameOrEmail);
    Task<ResetPasswordResult> ResetPasswordAsync(string token, string newPassword);
    Task RevokeAllRefreshTokensAsync(string userId);
}
