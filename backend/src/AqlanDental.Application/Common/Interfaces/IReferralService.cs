using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── Referral DTOs ─────────────────────────────────────────────────

public record ReferralDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    Guid FromDoctorId,
    string FromDoctorName,
    Guid ToDoctorId,
    string ToDoctorName,
    string? Reason,
    string? Notes,
    int Status,
    string StatusDisplay,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateReferralRequest(
    Guid PatientId,
    Guid FromDoctorId,
    Guid ToDoctorId,
    string? Reason,
    string? Notes
);

public record UpdateReferralRequest(
    int? Status,
    string? Reason,
    string? Notes
);

// ─── Interface ──────────────────────────────────────────────────────

public interface IReferralService
{
    Task<PagedResult<ReferralDto>> GetReferralsAsync(Guid? patientId, int? status, int page, int pageSize);
    Task<ReferralDto?> GetReferralByIdAsync(Guid id);
    Task<ReferralDto> CreateReferralAsync(CreateReferralRequest request, string userId);
    Task<ReferralDto?> UpdateReferralAsync(Guid id, UpdateReferralRequest request, string userId);
}
