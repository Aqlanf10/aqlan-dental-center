using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Constants;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class BookingRequestService : IBookingRequestService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] BookingRequestStatusDisplay =
        { "جديد", "تم التواصل", "معتمد", "مرفوض", "تم التحويل لموعد", "ملغي" };

    public BookingRequestService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<BookingRequestDto>> GetBookingRequestsAsync(
        int page, int pageSize, string? search,
        int? status, DateOnly? dateFrom, DateOnly? dateTo)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.BookingRequests
            .Include(b => b.PreferredDoctor)
            .Include(b => b.LinkedPatient)
            .Where(b => b.IsActive);

        if (status.HasValue)
            query = query.Where(b => (int)b.Status == status.Value);

        if (dateFrom.HasValue)
            query = query.Where(b => b.CreatedAt.Date >= dateFrom.Value.ToDateTime(TimeOnly.MinValue));

        if (dateTo.HasValue)
            query = query.Where(b => b.CreatedAt.Date <= dateTo.Value.ToDateTime(TimeOnly.MinValue));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(b =>
                b.PatientName.ToLower().Contains(searchLower) ||
                b.PhoneNumber.ToLower().Contains(searchLower));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => MapToDto(b))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<BookingRequestDto>(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<BookingRequestDto?> GetBookingRequestByIdAsync(Guid id)
    {
        var bookingRequest = await _context.BookingRequests
            .Include(b => b.PreferredDoctor)
            .Include(b => b.LinkedPatient)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (bookingRequest is null)
            return null;

        return MapToDto(bookingRequest);
    }

    public async Task<BookingRequestDto> CreatePublicBookingRequestAsync(
        CreatePublicBookingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PatientName))
            throw new DomainException("PATIENT_NAME_REQUIRED", "اسم المريض مطلوب");

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            throw new DomainException("PHONE_REQUIRED", "رقم الهاتف مطلوب");

        if (string.IsNullOrWhiteSpace(request.ServiceType))
            throw new DomainException("SERVICE_TYPE_REQUIRED", "نوع الخدمة مطلوب");

        if (!ServiceTypes.All.Contains(request.ServiceType))
            throw new DomainException("INVALID_SERVICE_TYPE", "نوع الخدمة غير صالح");

        if (request.PreferredDoctorId.HasValue)
        {
            var doctorExists = await _context.Doctors
                .AnyAsync(d => d.Id == request.PreferredDoctorId.Value && d.IsActive);
            if (!doctorExists)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
        }

        var bookingRequest = new BookingRequest
        {
            Id = Guid.NewGuid(),
            PatientName = request.PatientName,
            PhoneNumber = request.PhoneNumber,
            ServiceType = request.ServiceType,
            PreferredDoctorId = request.PreferredDoctorId,
            PreferredDate = request.PreferredDate,
            PreferredTime = request.PreferredTime,
            Notes = request.Notes,
            Status = BookingRequestStatus.New,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.BookingRequests.Add(bookingRequest);
        await _context.SaveChangesAsync();

        return (await GetBookingRequestByIdAsync(bookingRequest.Id))!;
    }

    public async Task<BookingRequestDto?> UpdateBookingRequestStatusAsync(
        Guid id, UpdateBookingRequestStatusRequest request, string userId)
    {
        if (!Enum.IsDefined(typeof(BookingRequestStatus), request.Status))
            throw new DomainException("INVALID_STATUS", "حالة طلب الحجز غير صالحة");

        var bookingRequest = await _context.BookingRequests.FindAsync(id);

        if (bookingRequest is null || !bookingRequest.IsActive)
            return null;

        var newStatus = (BookingRequestStatus)request.Status;

        // Basic transition validation
        if (!IsValidStatusTransition(bookingRequest.Status, newStatus))
            throw new DomainException("INVALID_STATUS_TRANSITION",
                "انتقال الحالة غير مسموح به");

        bookingRequest.Status = newStatus;
        bookingRequest.UpdatedAt = DateTime.UtcNow;
        bookingRequest.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return await GetBookingRequestByIdAsync(id);
    }

    public async Task<ConvertToAppointmentResult?> ConvertToAppointmentAsync(
        Guid id, string userId)
    {
        var bookingRequest = await _context.BookingRequests
            .Include(b => b.PreferredDoctor)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (bookingRequest is null || !bookingRequest.IsActive)
            return null;

        if (bookingRequest.Status != BookingRequestStatus.New
            && bookingRequest.Status != BookingRequestStatus.Approved)
        {
            throw new DomainException("INVALID_BOOKING_STATUS",
                "يجب أن يكون طلب الحجز جديد أو معتمد للتحويل");
        }

        bool patientCreated = false;
        Guid patientId;

        // Check if patient exists by PhoneNumber
        var existingPatient = await _context.Patients
            .FirstOrDefaultAsync(p => p.PhoneNumber == bookingRequest.PhoneNumber && p.IsActive);

        if (existingPatient != null)
        {
            patientId = existingPatient.Id;
            bookingRequest.LinkedPatientId = existingPatient.Id;
        }
        else
        {
            // Create new patient
            var patientNumber = await GeneratePatientNumberAsync();
            var newPatient = new Patient
            {
                Id = Guid.NewGuid(),
                PatientNumber = patientNumber,
                FullName = bookingRequest.PatientName,
                PhoneNumber = bookingRequest.PhoneNumber,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.Patients.Add(newPatient);
            patientId = newPatient.Id;
            bookingRequest.LinkedPatientId = newPatient.Id;
            patientCreated = true;
        }

        // Create appointment
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            DoctorId = bookingRequest.PreferredDoctorId ?? Guid.Empty,
            AppointmentDate = bookingRequest.PreferredDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
            StartTime = bookingRequest.PreferredTime ?? new TimeOnly(9, 0),
            ServiceType = bookingRequest.ServiceType,
            Status = AppointmentStatus.Scheduled,
            Notes = bookingRequest.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        // If no preferred doctor, we need to handle it
        if (!bookingRequest.PreferredDoctorId.HasValue)
        {
            throw new DomainException("DOCTOR_REQUIRED",
                "يجب تحديد طبيب مفضل لتحويل طلب الحجز إلى موعد");
        }

        _context.Appointments.Add(appointment);

        // Update booking request
        bookingRequest.Status = BookingRequestStatus.ConvertedToAppointment;
        bookingRequest.ConvertedAppointmentId = appointment.Id;
        bookingRequest.UpdatedAt = DateTime.UtcNow;
        bookingRequest.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        var appointmentDto = (await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .Where(a => a.Id == appointment.Id)
            .Select(a => new AppointmentDto(
                a.Id, a.PatientId, a.Patient.FullName,
                a.DoctorId, a.Doctor.FullName,
                a.AppointmentDate, a.StartTime, a.EndTime,
                a.ServiceType, (int)a.Status,
                GetAppointmentStatusDisplay((int)a.Status),
                a.Notes, a.IsActive, a.CreatedAt, a.UpdatedAt))
            .FirstAsync())!;

        var bookingRequestDto = (await GetBookingRequestByIdAsync(id))!;

        return new ConvertToAppointmentResult(appointmentDto, bookingRequestDto, patientCreated);
    }

    public async Task<bool> SoftDeleteBookingRequestAsync(Guid id)
    {
        var bookingRequest = await _context.BookingRequests.FindAsync(id);

        if (bookingRequest is null || !bookingRequest.IsActive)
            return false;

        bookingRequest.IsActive = false;
        bookingRequest.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    private static bool IsValidStatusTransition(
        BookingRequestStatus current, BookingRequestStatus next)
    {
        return current switch
        {
            BookingRequestStatus.New => next == BookingRequestStatus.Contacted
                                     || next == BookingRequestStatus.Cancelled,
            BookingRequestStatus.Contacted => next == BookingRequestStatus.Approved
                                           || next == BookingRequestStatus.Rejected
                                           || next == BookingRequestStatus.Cancelled,
            BookingRequestStatus.Approved => next == BookingRequestStatus.ConvertedToAppointment
                                           || next == BookingRequestStatus.Cancelled,
            _ => false
        };
    }

    private async Task<string> GeneratePatientNumberAsync()
    {
        var maxNumber = await _context.Patients
            .Where(p => p.PatientNumber.StartsWith("P-"))
            .Select(p => p.PatientNumber)
            .ToListAsync();

        int nextNumber = 1;
        if (maxNumber.Any())
        {
            var numericParts = maxNumber
                .Select(pn => pn.Substring(2))
                .Where(s => int.TryParse(s, out _))
                .Select(int.Parse)
                .ToList();

            if (numericParts.Any())
                nextNumber = numericParts.Max() + 1;
        }

        return $"P-{nextNumber:D4}";
    }

    private static BookingRequestDto MapToDto(BookingRequest b) => new(
        b.Id,
        b.PatientName,
        b.PhoneNumber,
        b.ServiceType,
        b.PreferredDoctorId,
        b.PreferredDoctor != null ? b.PreferredDoctor.FullName : null,
        b.PreferredDate,
        b.PreferredTime,
        b.Notes,
        (int)b.Status,
        GetBookingRequestStatusDisplay((int)b.Status),
        b.LinkedPatientId,
        b.LinkedPatient != null ? b.LinkedPatient.FullName : null,
        b.ConvertedAppointmentId,
        b.IsActive,
        b.CreatedAt,
        b.UpdatedAt
    );

    private static string GetBookingRequestStatusDisplay(int status) =>
        status >= 0 && status < BookingRequestStatusDisplay.Length
            ? BookingRequestStatusDisplay[status]
            : status.ToString();

    private static string GetAppointmentStatusDisplay(int status) =>
        status switch
        {
            0 => "مجدول",
            1 => "مؤكد",
            2 => "مكتمل",
            3 => "ملغي",
            4 => "لم يحضر",
            _ => status.ToString()
        };
}
