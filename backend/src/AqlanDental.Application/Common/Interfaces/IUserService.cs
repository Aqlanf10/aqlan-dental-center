namespace AqlanDental.Application.Common.Interfaces;

public record UserInfo(
    string UserId,
    string Email,
    string FullName,
    string? FullNameAr,
    bool IsActive,
    IList<string> Roles
);

public interface IUserService
{
    Task<UserInfo?> ValidateCredentialsAsync(string email, string password);
    Task UpdateLastLoginAsync(string userId);
    Task<UserInfo?> GetUserByIdAsync(string userId);
    Task<IList<string>> GetUserRolesAsync(string userId);
}
