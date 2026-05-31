using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;

namespace AqlanDental.Infrastructure.Services;

public class ExpenseService : IExpenseService
{
    public Task<OperationalExpenseDto> CreateAsync(CreateExpenseRequest request, string userId)
        => throw new NotImplementedException();

    public Task<PagedResult<OperationalExpenseDto>> GetAllAsync(int page, int pageSize, int? category, int? approvalStatus)
        => Task.FromResult(new PagedResult<OperationalExpenseDto>([], 0, page, pageSize, 0));

    public Task<PagedResult<OperationalExpenseDto>> GetPendingAsync(int page, int pageSize)
        => Task.FromResult(new PagedResult<OperationalExpenseDto>([], 0, page, pageSize, 0));

    public Task<OperationalExpenseDto?> GetByIdAsync(Guid id)
        => Task.FromResult<OperationalExpenseDto?>(null);

    public Task<OperationalExpenseDto?> ApproveAsync(Guid id, ApproveExpenseRequest request, string userId)
        => Task.FromResult<OperationalExpenseDto?>(null);

    public Task<OperationalExpenseDto?> RejectAsync(Guid id, RejectExpenseRequest request, string userId)
        => Task.FromResult<OperationalExpenseDto?>(null);

    public Task<bool> DeleteAsync(Guid id, string userId)
        => Task.FromResult(false);
}
