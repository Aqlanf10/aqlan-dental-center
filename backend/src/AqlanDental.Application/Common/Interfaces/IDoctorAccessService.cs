namespace AqlanDental.Application.Common.Interfaces;

/// <summary>
/// Doctor access filtering service — placeholder for future implementation.
/// Currently, the Doctor entity does not have a UserId foreign key,
/// making it impossible to reliably map the authenticated user to a Doctor record.
/// Once the Doctor entity is extended with a UserId field, this service
/// should enforce strict filtering so doctors can only see their own patients/visits.
///
/// TODO: Add UserId to Doctor entity and implement strict access filtering.
/// </summary>
public interface IDoctorAccessService
{
    /// <summary>
    /// Gets the DoctorId for the currently authenticated user.
    /// Returns null if the user is not linked to a Doctor record.
    /// </summary>
    Task<Guid?> GetCurrentDoctorIdAsync(string userId);

    /// <summary>
    /// Checks if strict doctor filtering should be applied for the given user.
    /// Returns false until Doctor.UserId mapping is implemented.
    /// </summary>
    Task<bool> ShouldFilterByDoctorAsync(string userId);
}

// Placeholder implementation — always returns null/no filtering
public class DoctorAccessService : IDoctorAccessService
{
    public Task<Guid?> GetCurrentDoctorIdAsync(string userId)
    {
        // TODO: Look up Doctor by UserId once Doctor.UserId exists
        return Task.FromResult<Guid?>(null);
    }

    public Task<bool> ShouldFilterByDoctorAsync(string userId)
    {
        // Not enforced yet — Doctor entity lacks UserId FK
        return Task.FromResult(false);
    }
}
