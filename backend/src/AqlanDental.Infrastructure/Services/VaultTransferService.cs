using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;

namespace AqlanDental.Infrastructure.Services;

public class VaultTransferService : IVaultTransferService
{
    public Task<PagedResult<VaultTransferDto>> GetAllAsync(int page, int pageSize, int? status)
        => Task.FromResult(new PagedResult<VaultTransferDto>([], 0, page, pageSize, 0));

    public Task<VaultTransferDto?> GetByIdAsync(Guid id)
        => Task.FromResult<VaultTransferDto?>(null);

    public Task<VaultTransferDto> CreateAsync(CreateVaultTransferRequest request, string userId)
        => throw new NotImplementedException();

    public Task<VaultTransferDto?> ApproveAsync(Guid id, ApproveVaultTransferRequest request, string userId)
        => Task.FromResult<VaultTransferDto?>(null);

    public Task<VaultTransferDto?> RejectAsync(Guid id, RejectVaultTransferRequest request, string userId)
        => Task.FromResult<VaultTransferDto?>(null);
}
