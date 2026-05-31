using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class FinanceService : IFinanceService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] ContractStatusDisplay = {
        "نشط", "مكتمل", "ملغي", "متخلف"
    };

    private static readonly string[] InvoiceStatusDisplay = {
        "مسودة", "صادرة", "مدفوعة", "ملغاة"
    };

    private static readonly string[] PaymentMethodDisplay = {
        "نقدي", "بطاقة", "تحويل بنكي", "شيك", "أخرى"
    };

    private static readonly string[] SessionStatusDisplay = {
        "مفتوحة", "مغلقة", "مسواة"
    };

    private static readonly string[] TreasuryTypeDisplay = {
        "خزنة", "بنك"
    };

    public FinanceService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    // ─── Contracts ──────────────────────────────────────────────────

    public async Task<PagedResult<ContractDto>> GetContractsAsync(
        Guid? patientId, int page, int pageSize, int? status)
    {
        var query = _context.Contracts
            .Include(c => c.Patient)
            .Where(c => c.IsActive);

        if (patientId.HasValue)
            query = query.Where(c => c.PatientId == patientId.Value);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(ContractStatus), status.Value))
                throw new DomainException("INVALID_CONTRACT_STATUS", "حالة العقد غير صالحة");
            query = query.Where(c => c.Status == (ContractStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapContractToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<ContractDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<ContractDto?> GetContractByIdAsync(Guid id)
    {
        var contract = await _context.Contracts
            .Include(c => c.Patient)
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        return contract is null ? null : MapContractToDto(contract);
    }

    public async Task<ContractDto> CreateContractAsync(
        CreateContractRequest request, string userId)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (request.TotalAmount < 0)
            throw new DomainException("INVALID_AMOUNT", "المبلغ الإجمالي لا يمكن أن يكون سالباً");

        if (request.DownPayment < 0)
            throw new DomainException("INVALID_DOWN_PAYMENT", "الدفعات المقدمة لا يمكن أن تكون سالبة");

        if (request.DownPayment > request.TotalAmount)
            throw new DomainException("DOWN_PAYMENT_EXCEEDS_TOTAL", "الدفعة المقدمة لا يمكن أن تتجاوز المبلغ الإجمالي");

        if (request.InstallmentsCount < 0)
            throw new DomainException("INVALID_INSTALLMENTS_COUNT", "عدد الأقساط لا يمكن أن يكون سالباً");

        var contract = new Contract
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            Specialty = request.Specialty?.Trim(),
            RelatedCaseId = request.RelatedCaseId,
            TotalAmount = request.TotalAmount,
            DownPayment = request.DownPayment,
            InstallmentsCount = request.InstallmentsCount,
            InstallmentAmount = request.InstallmentAmount,
            StartDate = request.StartDate,
            DiscountAmount = request.DiscountAmount,
            DiscountReason = request.DiscountReason?.Trim(),
            Status = ContractStatus.Active,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.Contracts.Add(contract);
        await _context.SaveChangesAsync();

        return (await GetContractByIdAsync(contract.Id))!;
    }

    public async Task<ContractDto?> UpdateContractStatusAsync(
        Guid id, UpdateContractStatusRequest request, string userId)
    {
        var contract = await _context.Contracts.FindAsync(id);
        if (contract is null || !contract.IsActive) return null;

        if (!Enum.IsDefined(typeof(ContractStatus), request.Status))
            throw new DomainException("INVALID_CONTRACT_STATUS", "حالة العقد غير صالحة");

        var newStatus = (ContractStatus)request.Status;

        // Validate status transition
        if (contract.Status == ContractStatus.Cancelled)
            throw new DomainException("CONTRACT_NOT_EDITABLE", "لا يمكن تعديل عقد ملغي");

        if (contract.Status == ContractStatus.Completed && newStatus != ContractStatus.Cancelled)
            throw new DomainException("CONTRACT_ALREADY_COMPLETED", "لا يمكن تغيير حالة عقد مكتمل");

        if (newStatus == ContractStatus.Defaulted && contract.Status != ContractStatus.Active)
            throw new DomainException("CONTRACT_STATUS_TRANSITION_INVALID",
                "الانتقال إلى 'متخلف' مسموح فقط من حالة 'نشط'");

        contract.Status = newStatus;
        contract.UpdatedAt = DateTime.UtcNow;
        contract.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetContractByIdAsync(id);
    }

    public async Task<List<ContractDto>> GetOverdueContractsAsync()
    {
        var today = DateTime.UtcNow;

        // Contracts with StartDate in the past that are still Active
        // and where total paid is less than total amount
        var contracts = await _context.Contracts
            .Include(c => c.Patient)
            .Include(c => c.Patient.Payments)
            .Where(c => c.IsActive && c.Status == ContractStatus.Active)
            .Where(c => c.StartDate.HasValue && c.StartDate.Value < DateOnly.FromDateTime(today))
            .ToListAsync();

        // Filter in memory: contracts where paid < total
        var overdue = contracts.Where(c =>
        {
            var totalPaid = c.Patient.Payments
                .Where(p => p.IsActive && p.ContractId == c.Id)
                .Sum(p => p.Amount);
            return totalPaid < c.TotalAmount;
        }).ToList();

        return overdue.Select(MapContractToDto).ToList();
    }

    // ─── Payments ───────────────────────────────────────────────────

    public async Task<PagedResult<PaymentDto>> GetPaymentsAsync(
        Guid? patientId, int page, int pageSize)
    {
        var query = _context.Payments
            .Include(p => p.Patient)
            .Include(p => p.Doctor)
            .Where(p => p.IsActive);

        if (patientId.HasValue)
            query = query.Where(p => p.PatientId == patientId.Value);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.PaymentDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapPaymentToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<PaymentDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<PaymentDto> CreatePaymentAsync(
        CreatePaymentRequest request, string userId)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (request.Amount <= 0)
            throw new DomainException("INVALID_PAYMENT_AMOUNT", "مبلغ الدفع يجب أن يكون أكبر من صفر");

        if (!Enum.IsDefined(typeof(PaymentMethod), request.PaymentMethod))
            throw new DomainException("INVALID_PAYMENT_METHOD", "طريقة الدفع غير صالحة");

        if (request.ContractId.HasValue)
        {
            var contract = await _context.Contracts.FindAsync(request.ContractId.Value);
            if (contract is null || !contract.IsActive)
                throw new DomainException("CONTRACT_NOT_FOUND", "العقد غير موجود");
        }

        if (request.InvoiceId.HasValue)
        {
            var invoice = await _context.Invoices.FindAsync(request.InvoiceId.Value);
            if (invoice is null || !invoice.IsActive)
                throw new DomainException("INVOICE_NOT_FOUND", "الفاتورة غير موجودة");
        }

        if (request.DoctorId.HasValue)
        {
            var doctor = await _context.Doctors.FindAsync(request.DoctorId.Value);
            if (doctor is null || !doctor.IsActive)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
        }

        // Auto-generate receipt number
        var receiptNumber = await GenerateReceiptNumberAsync();

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            ContractId = request.ContractId,
            InvoiceId = request.InvoiceId,
            PatientId = request.PatientId,
            Amount = request.Amount,
            PaymentDate = request.PaymentDate ?? DateTime.UtcNow,
            PaymentMethod = (PaymentMethod)request.PaymentMethod,
            ServiceDescription = request.ServiceDescription?.Trim(),
            DoctorId = request.DoctorId,
            ReceivedBy = request.ReceivedBy?.Trim(),
            ReceiptNumber = receiptNumber,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.Payments.Add(payment);

        // Create cash flow transaction for this payment
        var transactionNumber = await GenerateTransactionNumberAsync();
        var activeSession = await _context.CashierSessions
            .FirstOrDefaultAsync(s => s.Status == SessionStatus.Open && s.IsActive);

        var cashFlowTransaction = new CashFlowTransaction
        {
            Id = Guid.NewGuid(),
            TransactionNumber = transactionNumber,
            Type = TransactionType.Inflow,
            Category = FinancialCategory.PatientPayment,
            Amount = request.Amount,
            PaymentMethod = (PaymentMethod)request.PaymentMethod,
            TransactionDate = payment.PaymentDate,
            ReferenceId = payment.Id,
            ReferenceNumber = receiptNumber,
            Description = $"دفعة من المريض: {patient.FullName}",
            PerformedBy = userId,
            CashierSessionId = activeSession?.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CashFlowTransactions.Add(cashFlowTransaction);

        // Update active session expected cash
        if (activeSession is not null)
        {
            activeSession.ExpectedClosingCash += request.Amount;
            activeSession.UpdatedAt = DateTime.UtcNow;
        }

        // Check if linked invoice should be marked as Paid
        if (request.InvoiceId.HasValue)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == request.InvoiceId.Value);

            if (invoice is not null && invoice.Status == InvoiceStatus.Issued)
            {
                var totalPaidForInvoice = invoice.Payments
                    .Where(p => p.IsActive)
                    .Sum(p => p.Amount);

                if (totalPaidForInvoice >= invoice.TotalAmount)
                {
                    invoice.Status = InvoiceStatus.Paid;
                    invoice.UpdatedAt = DateTime.UtcNow;
                    invoice.UpdatedBy = userId;
                }
            }
        }

        await _context.SaveChangesAsync();

        // Re-fetch with includes
        var created = await _context.Payments
            .Include(p => p.Patient)
            .Include(p => p.Doctor)
            .FirstAsync(p => p.Id == payment.Id);

        return MapPaymentToDto(created);
    }

    // ─── Finance Summary ────────────────────────────────────────────

    public async Task<PatientFinanceSummaryDto> GetPatientFinanceSummaryAsync(Guid patientId)
    {
        var patient = await _context.Patients
            .Include(p => p.Contracts)
            .Include(p => p.Payments)
            .Include(p => p.Invoices)
            .FirstOrDefaultAsync(p => p.Id == patientId && p.IsActive);

        if (patient is null)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        var activeContracts = patient.Contracts.Where(c => c.IsActive && c.Status == ContractStatus.Active).ToList();
        var totalPaid = patient.Payments.Where(p => p.IsActive).Sum(p => p.Amount);
        var totalContractsAmount = patient.Contracts.Where(c => c.IsActive).Sum(c => c.TotalAmount);
        var totalInvoicesAmount = patient.Invoices.Where(i => i.IsActive).Sum(i => i.TotalAmount);
        var totalInvoicesPaid = patient.Invoices
            .Where(i => i.IsActive && i.Status == InvoiceStatus.Paid)
            .Sum(i => i.TotalAmount);

        return new PatientFinanceSummaryDto(
            patientId,
            patient.FullName,
            patient.PatientNumber,
            totalContractsAmount,
            totalPaid,
            totalContractsAmount - totalPaid,
            activeContracts.Count,
            patient.Payments.Count(p => p.IsActive),
            totalInvoicesAmount,
            totalInvoicesPaid
        );
    }

    public async Task<FinanceDashboardDto> GetFinanceDashboardAsync()
    {
        var today = DateTime.UtcNow;
        var todayDate = DateOnly.FromDateTime(today);
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var todayPayments = await _context.Payments
            .Where(p => p.IsActive && p.PaymentDate.Date == today.Date)
            .ToListAsync();

        var monthPayments = await _context.Payments
            .Where(p => p.IsActive && p.PaymentDate >= monthStart)
            .ToListAsync();

        var activeContracts = await _context.Contracts
            .Where(c => c.IsActive && c.Status == ContractStatus.Active)
            .ToListAsync();

        var openInvoices = await _context.Invoices
            .Where(i => i.IsActive && i.Status == InvoiceStatus.Issued)
            .ToListAsync();

        var treasuries = await _context.Treasuries
            .Where(t => t.IsActive)
            .ToListAsync();

        var totalPaidForContracts = await _context.Payments
            .Where(p => p.IsActive && p.ContractId.HasValue)
            .SumAsync(p => p.Amount);

        var totalContractsAmount = activeContracts.Sum(c => c.TotalAmount);
        var overdueContracts = await GetOverdueContractsAsync();

        return new FinanceDashboardDto(
            todayPayments.Sum(p => p.Amount),
            todayPayments.Count,
            monthPayments.Sum(p => p.Amount),
            monthPayments.Count,
            totalContractsAmount,
            activeContracts.Count,
            totalContractsAmount - totalPaidForContracts,
            overdueContracts.Count,
            treasuries.Sum(t => t.Balance),
            openInvoices.Count,
            openInvoices.Sum(i => i.TotalAmount)
        );
    }

    // ─── Invoices ───────────────────────────────────────────────────

    public async Task<PagedResult<InvoiceListItemDto>> GetInvoicesAsync(
        Guid? patientId, int page, int pageSize, int? status)
    {
        var query = _context.Invoices
            .Include(i => i.Patient)
            .Where(i => i.IsActive);

        if (patientId.HasValue)
            query = query.Where(i => i.PatientId == patientId.Value);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(InvoiceStatus), status.Value))
                throw new DomainException("INVALID_INVOICE_STATUS", "حالة الفاتورة غير صالحة");
            query = query.Where(i => i.Status == (InvoiceStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapInvoiceToListItemDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<InvoiceListItemDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<InvoiceDto?> GetInvoiceByIdAsync(Guid id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Patient)
            .Include(i => i.LineItems.Where(li => li.IsActive))
                .ThenInclude(li => li.Doctor)
            .FirstOrDefaultAsync(i => i.Id == id && i.IsActive);

        return invoice is null ? null : MapInvoiceToDto(invoice);
    }

    public async Task<InvoiceDto> CreateInvoiceAsync(
        CreateInvoiceRequest request, string userId)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (request.VisitId.HasValue)
        {
            var visit = await _context.ClinicalVisits.FindAsync(request.VisitId.Value);
            if (visit is null || !visit.IsActive)
                throw new DomainException("VISIT_NOT_FOUND", "الزيارة غير موجودة");
        }

        if (request.LineItems is null || request.LineItems.Count == 0)
            throw new DomainException("INVOICE_LINE_ITEMS_REQUIRED", "الفاتورة يجب أن تحتوي على عنصر واحد على الأقل");

        // Calculate totals
        var subtotal = request.LineItems.Sum(li => li.Quantity * li.UnitPrice - li.LineDiscountAmount);
        var totalAmount = subtotal - request.DiscountAmount + request.TaxAmount;

        var invoiceNumber = await GenerateInvoiceNumberAsync();

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            VisitId = request.VisitId,
            InvoiceNumber = invoiceNumber,
            Status = InvoiceStatus.Draft,
            Subtotal = subtotal,
            DiscountAmount = request.DiscountAmount,
            TaxAmount = request.TaxAmount,
            TotalAmount = totalAmount,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        // Create line items
        foreach (var liRequest in request.LineItems)
        {
            var lineItem = new InvoiceLineItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoice.Id,
                ClinicServiceId = liRequest.ClinicServiceId,
                ServiceNameSnapshot = liRequest.ServiceNameSnapshot.Trim(),
                Description = liRequest.Description?.Trim(),
                Quantity = liRequest.Quantity,
                UnitPrice = liRequest.UnitPrice,
                TotalPrice = liRequest.Quantity * liRequest.UnitPrice - liRequest.LineDiscountAmount,
                LineDiscountAmount = liRequest.LineDiscountAmount,
                DoctorId = liRequest.DoctorId,
                ToothNumber = liRequest.ToothNumber?.Trim(),
                SortOrder = liRequest.SortOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            invoice.LineItems.Add(lineItem);
        }

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        return (await GetInvoiceByIdAsync(invoice.Id))!;
    }

    public async Task<InvoiceDto?> UpdateInvoiceStatusAsync(
        Guid id, UpdateInvoiceStatusRequest request, string userId)
    {
        var invoice = await _context.Invoices.FindAsync(id);
        if (invoice is null || !invoice.IsActive) return null;

        if (!Enum.IsDefined(typeof(InvoiceStatus), request.Status))
            throw new DomainException("INVALID_INVOICE_STATUS", "حالة الفاتورة غير صالحة");

        var newStatus = (InvoiceStatus)request.Status;

        // Validate status transition
        if (invoice.Status == InvoiceStatus.Cancelled)
            throw new DomainException("INVOICE_NOT_EDITABLE", "لا يمكن تعديل فاتورة ملغاة");

        if (invoice.Status == InvoiceStatus.Paid && newStatus != InvoiceStatus.Cancelled)
            throw new DomainException("INVOICE_ALREADY_PAID", "لا يمكن تغيير حالة فاتورة مدفوعة");

        if (invoice.Status == InvoiceStatus.Draft && newStatus == InvoiceStatus.Paid)
            throw new DomainException("INVOICE_MUST_BE_ISSUED_FIRST", "يجب إصدار الفاتورة قبل تسجيل الدفع");

        if (invoice.Status == InvoiceStatus.Issued && newStatus == InvoiceStatus.Draft)
            throw new DomainException("INVOICE_CANNOT_REVERT_TO_DRAFT", "لا يمكن إعادة فاتورة صادرة إلى مسودة");

        invoice.Status = newStatus;
        invoice.UpdatedAt = DateTime.UtcNow;
        invoice.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetInvoiceByIdAsync(id);
    }

    // ─── Cashier Sessions ───────────────────────────────────────────

    public async Task<CashierSessionDto> OpenCashierSessionAsync(
        OpenCashierSessionRequest request, string userId)
    {
        // Check if there's already an open session
        var existingOpen = await _context.CashierSessions
            .AnyAsync(s => s.Status == SessionStatus.Open && s.IsActive);

        if (existingOpen)
            throw new DomainException("SESSION_ALREADY_OPEN", "يوجد جلسة كاشير مفتوحة بالفعل");

        var sessionNumber = await GenerateSessionNumberAsync();

        var session = new CashierSession
        {
            Id = Guid.NewGuid(),
            SessionNumber = sessionNumber,
            CashierId = userId,
            OpeningTime = DateTime.UtcNow,
            OpeningBalance = request.OpeningBalance,
            ExpectedClosingCash = request.OpeningBalance,
            Status = SessionStatus.Open,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CashierSessions.Add(session);
        await _context.SaveChangesAsync();

        return (await GetCashierSessionByIdInternalAsync(session.Id))!;
    }

    public async Task<CashierSessionDto?> CloseCashierSessionAsync(
        Guid sessionId, CloseCashierSessionRequest request, string userId)
    {
        var session = await _context.CashierSessions.FindAsync(sessionId);
        if (session is null || !session.IsActive) return null;

        if (session.Status != SessionStatus.Open)
            throw new DomainException("SESSION_NOT_OPEN", "جلسة الكاشير ليست مفتوحة");

        session.ClosingTime = DateTime.UtcNow;
        session.ActualClosingCash = request.ActualClosingCash;
        session.Status = SessionStatus.Closed;
        session.Notes = string.IsNullOrWhiteSpace(session.Notes)
            ? request.Notes?.Trim()
            : $"{session.Notes}\n{request.Notes?.Trim()}";
        session.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetCashierSessionByIdInternalAsync(session.Id);
    }

    public async Task<CashierSessionDto?> GetActiveCashierSessionAsync()
    {
        var session = await _context.CashierSessions
            .Include(s => s.Cashier)
            .FirstOrDefaultAsync(s => s.Status == SessionStatus.Open && s.IsActive);

        return session is null ? null : MapCashierSessionToDto(session);
    }

    // ─── Treasuries ─────────────────────────────────────────────────

    public async Task<List<TreasuryDto>> GetTreasuriesAsync()
    {
        var treasuries = await _context.Treasuries
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .ToListAsync();

        return treasuries.Select(MapTreasuryToDto).ToList();
    }

    public async Task<TreasuryDto> CreateTreasuryAsync(
        CreateTreasuryRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainException("TREASURY_NAME_REQUIRED", "اسم الخزنة مطلوب");

        if (!Enum.IsDefined(typeof(TreasuryType), request.Type))
            throw new DomainException("INVALID_TREASURY_TYPE", "نوع الخزنة غير صالح");

        var treasury = new Treasury
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Type = (TreasuryType)request.Type,
            Balance = request.InitialBalance,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Treasuries.Add(treasury);

        // If initial balance > 0, create an inflow transaction
        if (request.InitialBalance > 0)
        {
            var transactionNumber = await GenerateTransactionNumberAsync();
            var transaction = new CashFlowTransaction
            {
                Id = Guid.NewGuid(),
                TransactionNumber = transactionNumber,
                Type = TransactionType.Inflow,
                Category = FinancialCategory.Other,
                Amount = request.InitialBalance,
                PaymentMethod = PaymentMethod.Cash,
                TransactionDate = DateTime.UtcNow,
                Description = $"رصيد افتتاحي - {request.Name.Trim()}",
                TreasuryId = treasury.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.CashFlowTransactions.Add(transaction);
        }

        await _context.SaveChangesAsync();

        return MapTreasuryToDto(treasury);
    }

    // ─── Private helpers ────────────────────────────────────────────

    private async Task<CashierSessionDto?> GetCashierSessionByIdInternalAsync(Guid id)
    {
        var session = await _context.CashierSessions
            .Include(s => s.Cashier)
            .FirstOrDefaultAsync(s => s.Id == id && s.IsActive);

        return session is null ? null : MapCashierSessionToDto(session);
    }

    private async Task<string> GenerateInvoiceNumberAsync()
    {
        var lastInvoice = await _context.Invoices
            .OrderByDescending(i => i.InvoiceNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastInvoice is not null && lastInvoice.InvoiceNumber.StartsWith("INV-"))
        {
            if (int.TryParse(lastInvoice.InvoiceNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"INV-{nextNumber:D5}";
    }

    private async Task<string> GenerateReceiptNumberAsync()
    {
        var lastPayment = await _context.Payments
            .OrderByDescending(p => p.ReceiptNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastPayment is not null && lastPayment.ReceiptNumber?.StartsWith("REC-") == true)
        {
            if (int.TryParse(lastPayment.ReceiptNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"REC-{nextNumber:D5}";
    }

    private async Task<string> GenerateTransactionNumberAsync()
    {
        var lastTransaction = await _context.CashFlowTransactions
            .OrderByDescending(t => t.TransactionNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastTransaction is not null && lastTransaction.TransactionNumber.StartsWith("TXN-"))
        {
            if (int.TryParse(lastTransaction.TransactionNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"TXN-{nextNumber:D5}";
    }

    private async Task<string> GenerateSessionNumberAsync()
    {
        var lastSession = await _context.CashierSessions
            .OrderByDescending(s => s.SessionNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastSession is not null && lastSession.SessionNumber.StartsWith("SES-"))
        {
            if (int.TryParse(lastSession.SessionNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"SES-{nextNumber:D4}";
    }

    // ─── Mapping methods ────────────────────────────────────────────

    private static ContractDto MapContractToDto(Contract c) => new(
        c.Id,
        c.PatientId,
        c.Patient?.FullName ?? string.Empty,
        c.Patient?.PatientNumber,
        c.Specialty,
        c.RelatedCaseId,
        c.TotalAmount,
        c.DownPayment,
        c.InstallmentsCount,
        c.InstallmentAmount,
        c.StartDate,
        c.DiscountAmount,
        c.DiscountReason,
        (int)c.Status,
        GetContractStatusDisplay((int)c.Status),
        c.Notes,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
    );

    private static InvoiceDto MapInvoiceToDto(Invoice i) => new(
        i.Id,
        i.PatientId,
        i.Patient?.FullName ?? string.Empty,
        i.Patient?.PatientNumber,
        i.VisitId,
        i.InvoiceNumber,
        (int)i.Status,
        GetInvoiceStatusDisplay((int)i.Status),
        i.Subtotal,
        i.DiscountAmount,
        i.TaxAmount,
        i.TotalAmount,
        i.Notes,
        i.IsActive,
        i.CreatedAt,
        i.UpdatedAt,
        i.LineItems.Where(li => li.IsActive).Select(MapInvoiceLineItemToDto).ToList()
    );

    private static InvoiceListItemDto MapInvoiceToListItemDto(Invoice i) => new(
        i.Id,
        i.PatientId,
        i.Patient?.FullName ?? string.Empty,
        i.Patient?.PatientNumber,
        i.InvoiceNumber,
        (int)i.Status,
        GetInvoiceStatusDisplay((int)i.Status),
        i.TotalAmount,
        i.IsActive,
        i.CreatedAt,
        i.UpdatedAt
    );

    private static InvoiceLineItemDto MapInvoiceLineItemToDto(InvoiceLineItem li) => new(
        li.Id,
        li.InvoiceId,
        li.ClinicServiceId,
        li.ServiceNameSnapshot,
        li.Description,
        li.Quantity,
        li.UnitPrice,
        li.TotalPrice,
        li.LineDiscountAmount,
        li.DoctorId,
        li.Doctor?.FullName,
        li.ToothNumber,
        li.SortOrder,
        li.IsActive,
        li.CreatedAt,
        li.UpdatedAt
    );

    private static PaymentDto MapPaymentToDto(Payment p) => new(
        p.Id,
        p.ContractId,
        p.InvoiceId,
        p.PatientId,
        p.Patient?.FullName ?? string.Empty,
        p.Patient?.PatientNumber,
        p.Amount,
        p.PaymentDate,
        (int)p.PaymentMethod,
        GetPaymentMethodDisplay((int)p.PaymentMethod),
        p.ServiceDescription,
        p.DoctorId,
        p.Doctor?.FullName,
        p.ReceivedBy,
        p.ReceiptNumber,
        p.Notes,
        p.IsActive,
        p.CreatedAt,
        p.UpdatedAt
    );

    private static CashierSessionDto MapCashierSessionToDto(CashierSession s) => new(
        s.Id,
        s.SessionNumber,
        s.CashierId,
        s.Cashier?.FullName ?? string.Empty,
        s.OpeningTime,
        s.ClosingTime,
        s.OpeningBalance,
        s.ExpectedClosingCash,
        s.ActualClosingCash,
        (int)s.Status,
        GetSessionStatusDisplay((int)s.Status),
        s.Notes,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    );

    private static TreasuryDto MapTreasuryToDto(Treasury t) => new(
        t.Id,
        t.Name,
        (int)t.Type,
        GetTreasuryTypeDisplay((int)t.Type),
        t.Balance,
        t.IsActive,
        t.CreatedAt,
        t.UpdatedAt
    );

    private static string GetContractStatusDisplay(int status) =>
        status >= 0 && status < ContractStatusDisplay.Length
            ? ContractStatusDisplay[status]
            : status.ToString();

    private static string GetInvoiceStatusDisplay(int status) =>
        status >= 0 && status < InvoiceStatusDisplay.Length
            ? InvoiceStatusDisplay[status]
            : status.ToString();

    private static string GetPaymentMethodDisplay(int method) =>
        method >= 0 && method < PaymentMethodDisplay.Length
            ? PaymentMethodDisplay[method]
            : method == 99 ? PaymentMethodDisplay[4] : method.ToString();

    private static string GetSessionStatusDisplay(int status) =>
        status >= 0 && status < SessionStatusDisplay.Length
            ? SessionStatusDisplay[status]
            : status.ToString();

    private static string GetTreasuryTypeDisplay(int type) =>
        type >= 0 && type < TreasuryTypeDisplay.Length
            ? TreasuryTypeDisplay[type]
            : type.ToString();
}
