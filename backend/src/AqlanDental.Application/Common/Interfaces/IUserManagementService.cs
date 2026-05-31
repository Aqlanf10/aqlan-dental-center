using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

public record UserListDto(
    string Id,
    string Email,
    string FullName,
    string? FullNameAr,
    string Role,
    bool IsActive,
    bool MustChangePassword,
    DateTime CreatedAt,
    DateTime? LastLoginAt
);

public record CreateUserRequest(
    string Email,
    string Password,
    string FullName,
    string? FullNameAr,
    string Role
);

public record UpdateUserRequest(
    string? FullName,
    string? FullNameAr,
    string? Role,
    string? Email
);

public record AdminResetPasswordResult(bool Success, string? TempPassword, string? Message);

public interface IUserManagementService
{
    Task<PagedResult<UserListDto>> GetUsersAsync(int page, int pageSize, string? search, string? role);
    Task<UserListDto?> GetUserByIdAsync(string userId);
    Task<UserListDto> CreateUserAsync(CreateUserRequest request);
    Task<UserListDto?> UpdateUserAsync(string userId, UpdateUserRequest request);
    Task<bool> ToggleUserStatusAsync(string userId);
    Task<bool> SoftDeleteUserAsync(string userId);
    Task<bool> RestoreUserAsync(string userId);
    Task<AdminResetPasswordResult> AdminResetPasswordAsync(string userId);
}
