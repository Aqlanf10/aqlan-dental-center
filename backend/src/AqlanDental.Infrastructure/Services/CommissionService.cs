using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;

namespace AqlanDental.Infrastructure.Services;

public class CommissionService : ICommissionService
{
    public Task<DoctorCommissionPaymentDto> CalculateForInvoiceAsync(CalculateCommissionRequest request, string userId)
        => throw new NotImplementedException();

    public Task<PagedResult<DoctorCommissionPaymentDto>> GetByDoctorAsync(Guid doctorId, int page, int pageSize, int? status)
        => Task.FromResult(new PagedResult<DoctorCommissionPaymentDto>([], 0, page, pageSize, 0));

    public Task<PagedResult<DoctorCommissionPaymentDto>> GetAllAsync(int page, int pageSize, int? status)
        => Task.FromResult(new PagedResult<DoctorCommissionPaymentDto>([], 0, page, pageSize, 0));

    public Task<DoctorCommissionPaymentDto?> GetByIdAsync(Guid id)
        => Task.FromResult<DoctorCommissionPaymentDto?>(null);

    public Task<DoctorCommissionPaymentDto?> ApproveAsync(Guid id, string userId)
        => Task.FromResult<DoctorCommissionPaymentDto?>(null);

    public Task<DoctorCommissionPaymentDto?> PayAsync(Guid id, Guid treasuryId, string userId)
        => Task.FromResult<DoctorCommissionPaymentDto?>(null);

    public Task<List<CommissionServiceDefaultsDto>> GetServiceDefaultsAsync()
        => Task.FromResult(new List<CommissionServiceDefaultsDto>());

    public Task<CommissionServiceDefaultsDto> UpdateServiceDefaultsAsync(UpdateCommissionServiceDefaultsRequest request)
        => throw new NotImplementedException();
}
