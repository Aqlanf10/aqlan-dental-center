using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── JournalEntry DTOs ─────────────────────────────────────────────

public record JournalLineDto(
    Guid Id,
    Guid JournalEntryId,
    int AccountType,
    string AccountTypeDisplay,
    Guid? AccountId,
    decimal Debit,
    decimal Credit,
    string? Description,
    Guid? BranchId,
    bool IsActive
);

public record JournalEntryDto(
    Guid Id,
    string EntryNumber,
    int DocumentType,
    string DocumentTypeDisplay,
    Guid? FinancialDocumentId,
    string Description,
    DateTime EntryDate,
    Guid? BranchId,
    string? BranchName,
    string? PerformedBy,
    Guid? CashierSessionId,
    Guid? TreasuryId,
    string? TreasuryName,
    bool IsPosted,
    DateTime? PostedAt,
    bool IsReversal,
    Guid? ReversalOfEntryId,
    Guid? ReversedByEntryId,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<JournalLineDto> Lines
);

public record CreateJournalEntryRequest(
    int DocumentType,
    Guid? FinancialDocumentId,
    string Description,
    DateTime? EntryDate,
    Guid? BranchId,
    Guid? TreasuryId,
    List<CreateJournalLineRequest> Lines
);

public record CreateJournalLineRequest(
    int AccountType,
    Guid? AccountId,
    decimal Debit,
    decimal Credit,
    string? Description,
    Guid? BranchId
);

// ─── Interface ─────────────────────────────────────────────────────

public interface IJournalEntryService
{
    Task<JournalEntryDto> CreateEntryAsync(CreateJournalEntryRequest request, string userId);
    Task<JournalEntryDto> CreateReversalEntryAsync(Guid entryId, string reason, string userId);
    Task<string> GenerateEntryNumberAsync();
    Task<PagedResult<JournalEntryDto>> GetEntriesAsync(int page, int pageSize, int? documentType, Guid? branchId, DateTime? fromDate, DateTime? toDate);
    Task<JournalEntryDto?> GetByIdAsync(Guid id);
}
