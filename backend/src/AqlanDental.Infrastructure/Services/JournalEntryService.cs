using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class JournalEntryService : IJournalEntryService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] FinancialDocumentTypeDisplay = {
        "فاتورة", "دفعة", "مصروف", "دفع راتب", "سلفة", "تحويل خزنة", "دفع مورد", "إشعار دائن", "دفع عمولة"
    };

    private static readonly string[] JournalAccountTypeDisplay = {
        "خزنة", "مصروف", "إيراد", "مستحق", "حقوق مالك", "مستحقات أخرى", "مريض"
    };

    public JournalEntryService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<JournalEntryDto> CreateEntryAsync(CreateJournalEntryRequest request, string userId)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            throw new DomainException("JOURNAL_LINES_REQUIRED", "القيد يجب أن يحتوي على سطر واحد على الأقل");

        // Validate debits == credits
        var totalDebits = request.Lines.Sum(l => l.Debit);
        var totalCredits = request.Lines.Sum(l => l.Credit);

        if (totalDebits != totalCredits)
            throw new DomainException("JOURNAL_NOT_BALANCED", "مجاميع المدين والدائن غير متساوية");

        if (totalDebits == 0 && totalCredits == 0)
            throw new DomainException("JOURNAL_ZERO_AMOUNT", "القيد يجب أن يحتوي على مبالغ غير صفرية");

        if (!Enum.IsDefined(typeof(FinancialDocumentType), request.DocumentType))
            throw new DomainException("INVALID_DOCUMENT_TYPE", "نوع المستند المالي غير صالح");

        if (string.IsNullOrWhiteSpace(request.Description))
            throw new DomainException("JOURNAL_DESCRIPTION_REQUIRED", "وصف القيد مطلوب");

        var entryNumber = await GenerateEntryNumberAsync();

        var entry = new JournalEntry
        {
            Id = Guid.NewGuid(),
            EntryNumber = entryNumber,
            DocumentType = (FinancialDocumentType)request.DocumentType,
            FinancialDocumentId = request.FinancialDocumentId,
            Description = request.Description.Trim(),
            EntryDate = request.EntryDate ?? DateTime.UtcNow,
            BranchId = request.BranchId,
            PerformedBy = userId,
            TreasuryId = request.TreasuryId,
            IsPosted = true,
            PostedAt = DateTime.UtcNow,
            IsReversal = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var lineRequest in request.Lines)
        {
            if (!Enum.IsDefined(typeof(JournalAccountType), lineRequest.AccountType))
                throw new DomainException("INVALID_ACCOUNT_TYPE", "نوع الحساب غير صالح");

            var line = new JournalLine
            {
                Id = Guid.NewGuid(),
                JournalEntryId = entry.Id,
                AccountType = (JournalAccountType)lineRequest.AccountType,
                AccountId = lineRequest.AccountId,
                Debit = lineRequest.Debit,
                Credit = lineRequest.Credit,
                Description = lineRequest.Description?.Trim(),
                BranchId = lineRequest.BranchId,
                IsActive = true
            };
            entry.Lines.Add(line);
        }

        _context.JournalEntries.Add(entry);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(entry.Id))!;
    }

    public async Task<JournalEntryDto> CreateReversalEntryAsync(Guid entryId, string reason, string userId)
    {
        var originalEntry = await _context.JournalEntries
            .Include(e => e.Lines.Where(l => l.IsActive))
            .FirstOrDefaultAsync(e => e.Id == entryId && e.IsActive);

        if (originalEntry is null)
            throw new DomainException("JOURNAL_ENTRY_NOT_FOUND", "القيد غير موجود");

        if (originalEntry.IsReversal)
            throw new DomainException("CANNOT_REVERSE_REVERSAL", "لا يمكن عكس قيد عكسي");

        if (originalEntry.ReversedByEntryId.HasValue)
            throw new DomainException("ENTRY_ALREADY_REVERSED", "تم عكس هذا القيد مسبقاً");

        var entryNumber = await GenerateEntryNumberAsync();

        var reversalEntry = new JournalEntry
        {
            Id = Guid.NewGuid(),
            EntryNumber = entryNumber,
            DocumentType = originalEntry.DocumentType,
            FinancialDocumentId = originalEntry.FinancialDocumentId,
            Description = $"عكس القيد {originalEntry.EntryNumber}: {reason.Trim()}",
            EntryDate = DateTime.UtcNow,
            BranchId = originalEntry.BranchId,
            PerformedBy = userId,
            TreasuryId = originalEntry.TreasuryId,
            CashierSessionId = originalEntry.CashierSessionId,
            IsPosted = true,
            PostedAt = DateTime.UtcNow,
            IsReversal = true,
            ReversalOfEntryId = originalEntry.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Create reversal lines with swapped debits/credits
        foreach (var originalLine in originalEntry.Lines)
        {
            var reversalLine = new JournalLine
            {
                Id = Guid.NewGuid(),
                JournalEntryId = reversalEntry.Id,
                AccountType = originalLine.AccountType,
                AccountId = originalLine.AccountId,
                Debit = originalLine.Credit,  // Swap
                Credit = originalLine.Debit,   // Swap
                Description = originalLine.Description,
                BranchId = originalLine.BranchId,
                IsActive = true
            };
            reversalEntry.Lines.Add(reversalLine);
        }

        // Mark original as reversed
        originalEntry.ReversedByEntryId = reversalEntry.Id;
        originalEntry.UpdatedAt = DateTime.UtcNow;

        _context.JournalEntries.Add(reversalEntry);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(reversalEntry.Id))!;
    }

    public async Task<string> GenerateEntryNumberAsync()
    {
        var lastEntry = await _context.JournalEntries
            .OrderByDescending(e => e.EntryNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastEntry is not null && lastEntry.EntryNumber.StartsWith("JE-"))
        {
            if (int.TryParse(lastEntry.EntryNumber[3..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"JE-{nextNumber:D5}";
    }

    public async Task<PagedResult<JournalEntryDto>> GetEntriesAsync(int page, int pageSize, int? documentType, Guid? branchId, DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.JournalEntries
            .Include(e => e.Lines.Where(l => l.IsActive))
            .Include(e => e.Branch)
            .Include(e => e.Treasury)
            .Where(e => e.IsActive);

        if (documentType.HasValue)
        {
            if (!Enum.IsDefined(typeof(FinancialDocumentType), documentType.Value))
                throw new DomainException("INVALID_DOCUMENT_TYPE", "نوع المستند المالي غير صالح");
            query = query.Where(e => e.DocumentType == (FinancialDocumentType)documentType.Value);
        }

        if (branchId.HasValue)
            query = query.Where(e => e.BranchId == branchId.Value);

        if (fromDate.HasValue)
            query = query.Where(e => e.EntryDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(e => e.EntryDate <= toDate.Value);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapJournalEntryToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<JournalEntryDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<JournalEntryDto?> GetByIdAsync(Guid id)
    {
        var entry = await _context.JournalEntries
            .Include(e => e.Lines.Where(l => l.IsActive))
            .Include(e => e.Branch)
            .Include(e => e.Treasury)
            .FirstOrDefaultAsync(e => e.Id == id && e.IsActive);

        return entry is null ? null : MapJournalEntryToDto(entry);
    }

    // ─── Mapping methods ───────────────────────────────────────────

    private static JournalEntryDto MapJournalEntryToDto(JournalEntry e) => new(
        e.Id,
        e.EntryNumber,
        (int)e.DocumentType,
        GetFinancialDocumentTypeDisplay((int)e.DocumentType),
        e.FinancialDocumentId,
        e.Description,
        e.EntryDate,
        e.BranchId,
        e.Branch?.Name,
        e.PerformedBy,
        e.CashierSessionId,
        e.TreasuryId,
        e.Treasury?.Name,
        e.IsPosted,
        e.PostedAt,
        e.IsReversal,
        e.ReversalOfEntryId,
        e.ReversedByEntryId,
        e.IsActive,
        e.CreatedAt,
        e.UpdatedAt,
        e.Lines.Where(l => l.IsActive).Select(MapJournalLineToDto).ToList()
    );

    private static JournalLineDto MapJournalLineToDto(JournalLine l) => new(
        l.Id,
        l.JournalEntryId,
        (int)l.AccountType,
        GetJournalAccountTypeDisplay((int)l.AccountType),
        l.AccountId,
        l.Debit,
        l.Credit,
        l.Description,
        l.BranchId,
        l.IsActive
    );

    private static string GetFinancialDocumentTypeDisplay(int type) =>
        type >= 0 && type < FinancialDocumentTypeDisplay.Length
            ? FinancialDocumentTypeDisplay[type]
            : type == 99 ? FinancialDocumentTypeDisplay[8] : type.ToString();

    private static string GetJournalAccountTypeDisplay(int type) =>
        type >= 0 && type < JournalAccountTypeDisplay.Length
            ? JournalAccountTypeDisplay[type]
            : type.ToString();
}
