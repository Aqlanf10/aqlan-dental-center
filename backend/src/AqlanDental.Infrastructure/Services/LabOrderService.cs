using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class LabOrderService : ILabOrderService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] LabOrderStatusDisplay = {
        "مرسل", "قيد التصنيع", "جاهز", "مستلم", "ملغي"
    };

    private static readonly string[] LabOrderPriorityDisplay = {
        "عاجل", "عادي", "منخفض"
    };

    public LabOrderService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<LabOrderDto>> GetLabOrdersAsync(
        Guid? patientId, int? status, int page, int pageSize)
    {
        var query = _context.LabOrders
            .Include(o => o.Patient)
            .Include(o => o.Doctor)
            .Where(o => o.IsActive);

        if (patientId.HasValue)
            query = query.Where(o => o.PatientId == patientId.Value);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(LabOrderStatus), status.Value))
                throw new DomainException("INVALID_STATUS", "حالة طلب المختبر غير صالحة");
            query = query.Where(o => o.Status == (LabOrderStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<LabOrderDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<LabOrderDto?> GetLabOrderByIdAsync(Guid id)
    {
        var order = await _context.LabOrders
            .Include(o => o.Patient)
            .Include(o => o.Doctor)
            .FirstOrDefaultAsync(o => o.Id == id && o.IsActive);

        return order is null ? null : MapToDto(order);
    }

    public async Task<LabOrderDto> CreateLabOrderAsync(
        CreateLabOrderRequest request, string userId)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (request.DoctorId.HasValue)
        {
            var doctor = await _context.Doctors.FindAsync(request.DoctorId.Value);
            if (doctor is null || !doctor.IsActive)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
        }

        var orderNumber = await GenerateOrderNumberAsync();

        var labOrder = new LabOrder
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            OrthoCaseId = request.OrthoCaseId,
            OrderNumber = orderNumber,
            ApplianceType = request.ApplianceType?.Trim(),
            LabName = request.LabName?.Trim(),
            SentDate = request.SentDate,
            ExpectedDate = request.ExpectedDate,
            Status = LabOrderStatus.Sent,
            Priority = (LabOrderPriority)request.Priority,
            Instructions = request.Instructions?.Trim(),
            Cost = request.Cost,
            DoctorId = request.DoctorId,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.LabOrders.Add(labOrder);
        await _context.SaveChangesAsync();

        return (await GetLabOrderByIdAsync(labOrder.Id))!;
    }

    public async Task<LabOrderDto?> UpdateLabOrderAsync(
        Guid id, UpdateLabOrderRequest request, string userId)
    {
        var labOrder = await _context.LabOrders.FindAsync(id);
        if (labOrder is null || !labOrder.IsActive) return null;

        if (request.ApplianceType is not null)
            labOrder.ApplianceType = request.ApplianceType.Trim();
        if (request.LabName is not null)
            labOrder.LabName = request.LabName.Trim();
        if (request.SentDate.HasValue)
            labOrder.SentDate = request.SentDate.Value;
        if (request.ExpectedDate.HasValue)
            labOrder.ExpectedDate = request.ExpectedDate.Value;
        if (request.ReceivedDate.HasValue)
            labOrder.ReceivedDate = request.ReceivedDate.Value;
        if (request.Status.HasValue)
        {
            if (!Enum.IsDefined(typeof(LabOrderStatus), request.Status.Value))
                throw new DomainException("INVALID_STATUS", "حالة طلب المختبر غير صالحة");
            labOrder.Status = (LabOrderStatus)request.Status.Value;
        }
        if (request.Priority.HasValue)
        {
            if (!Enum.IsDefined(typeof(LabOrderPriority), request.Priority.Value))
                throw new DomainException("INVALID_PRIORITY", "أولوية طلب المختبر غير صالحة");
            labOrder.Priority = (LabOrderPriority)request.Priority.Value;
        }
        if (request.Instructions is not null)
            labOrder.Instructions = request.Instructions.Trim();
        if (request.Cost.HasValue)
            labOrder.Cost = request.Cost.Value;
        if (request.DoctorId.HasValue)
            labOrder.DoctorId = request.DoctorId.Value;
        if (request.Notes is not null)
            labOrder.Notes = request.Notes.Trim();

        labOrder.UpdatedAt = DateTime.UtcNow;
        labOrder.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetLabOrderByIdAsync(id);
    }

    private async Task<string> GenerateOrderNumberAsync()
    {
        var lastOrder = await _context.LabOrders
            .OrderByDescending(o => o.OrderNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastOrder is not null && lastOrder.OrderNumber?.StartsWith("LAB-") == true)
        {
            if (int.TryParse(lastOrder.OrderNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"LAB-{nextNumber:D4}";
    }

    private static LabOrderDto MapToDto(LabOrder o) => new(
        o.Id,
        o.PatientId,
        o.Patient?.FullName ?? string.Empty,
        o.Patient?.PatientNumber,
        o.OrthoCaseId,
        o.OrderNumber,
        o.ApplianceType,
        o.LabName,
        o.SentDate,
        o.ExpectedDate,
        o.ReceivedDate,
        (int)o.Status,
        GetStatusDisplay((int)o.Status),
        (int)o.Priority,
        GetPriorityDisplay((int)o.Priority),
        o.Instructions,
        o.Cost,
        o.DoctorId,
        o.Doctor?.FullName,
        o.Notes,
        o.IsActive,
        o.CreatedAt,
        o.UpdatedAt
    );

    private static string GetStatusDisplay(int status) =>
        status >= 0 && status < LabOrderStatusDisplay.Length
            ? LabOrderStatusDisplay[status]
            : status.ToString();

    private static string GetPriorityDisplay(int priority) =>
        priority >= 0 && priority < LabOrderPriorityDisplay.Length
            ? LabOrderPriorityDisplay[priority]
            : priority.ToString();
}
