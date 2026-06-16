using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;

namespace AqlanDental.Infrastructure.Services;

public class JournalEntryService : IJournalEntryService
{
    public Task<JournalEntryDto> CreateEntryAsync(CreateJournalEntryRequest request, string userId)
        => throw new NotImplementedException();

    public Task<JournalEntryDto> CreateReversalEntryAsync(Guid entryId, string reason, string userId)
        => throw new NotImplementedException();

    public Task<string> GenerateEntryNumberAsync()
        => Task.FromResult($"JE-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..20]);

    public Task<PagedResult<JournalEntryDto>> GetEntriesAsync(int page, int pageSize, int? documentType, Guid? branchId, DateTime? fromDate, DateTime? toDate)
        => Task.FromResult(new PagedResult<JournalEntryDto>([], 0, page, pageSize, 0));

    public Task<JournalEntryDto?> GetByIdAsync(Guid id)
        => Task.FromResult<JournalEntryDto?>(null);
}
