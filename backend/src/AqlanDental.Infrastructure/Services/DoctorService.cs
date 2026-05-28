using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class DoctorService : IDoctorService
{
    private readonly AqlanDentalDbContext _context;

    public DoctorService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<DoctorDto>> GetDoctorsAsync(int page, int pageSize, string? search)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Doctors.Where(d => d.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(d =>
                d.FullName.ToLower().Contains(searchLower) ||
                d.Specialty.ToLower().Contains(searchLower) ||
                (d.PhoneNumber != null && d.PhoneNumber.ToLower().Contains(searchLower)));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(d => d.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new DoctorDto(
                d.Id,
                d.FullName,
                d.Specialty,
                d.PhoneNumber,
                d.Email,
                d.Color,
                d.IsActive,
                d.CreatedAt,
                d.UpdatedAt
            ))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<DoctorDto>(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<DoctorDto?> GetDoctorByIdAsync(Guid id)
    {
        var doctor = await _context.Doctors.FindAsync(id);

        if (doctor is null)
            return null;

        return new DoctorDto(
            doctor.Id,
            doctor.FullName,
            doctor.Specialty,
            doctor.PhoneNumber,
            doctor.Email,
            doctor.Color,
            doctor.IsActive,
            doctor.CreatedAt,
            doctor.UpdatedAt
        );
    }

    public async Task<DoctorDto> CreateDoctorAsync(CreateDoctorRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new DomainException("DOCTOR_NAME_REQUIRED", "اسم الطبيب مطلوب");

        if (string.IsNullOrWhiteSpace(request.Specialty))
            throw new DomainException("DOCTOR_SPECIALTY_REQUIRED", "تخصص الطبيب مطلوب");

        var doctor = new Doctor
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Specialty = request.Specialty,
            PhoneNumber = request.PhoneNumber,
            Email = request.Email,
            Color = request.Color,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.Doctors.Add(doctor);
        await _context.SaveChangesAsync();

        return new DoctorDto(
            doctor.Id,
            doctor.FullName,
            doctor.Specialty,
            doctor.PhoneNumber,
            doctor.Email,
            doctor.Color,
            doctor.IsActive,
            doctor.CreatedAt,
            doctor.UpdatedAt
        );
    }

    public async Task<DoctorDto?> UpdateDoctorAsync(Guid id, UpdateDoctorRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new DomainException("DOCTOR_NAME_REQUIRED", "اسم الطبيب مطلوب");

        if (string.IsNullOrWhiteSpace(request.Specialty))
            throw new DomainException("DOCTOR_SPECIALTY_REQUIRED", "تخصص الطبيب مطلوب");

        var doctor = await _context.Doctors.FindAsync(id);

        if (doctor is null || !doctor.IsActive)
            return null;

        doctor.FullName = request.FullName;
        doctor.Specialty = request.Specialty;
        doctor.PhoneNumber = request.PhoneNumber;
        doctor.Email = request.Email;
        doctor.Color = request.Color;
        doctor.UpdatedAt = DateTime.UtcNow;
        doctor.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return new DoctorDto(
            doctor.Id,
            doctor.FullName,
            doctor.Specialty,
            doctor.PhoneNumber,
            doctor.Email,
            doctor.Color,
            doctor.IsActive,
            doctor.CreatedAt,
            doctor.UpdatedAt
        );
    }

    public async Task<bool> SoftDeleteDoctorAsync(Guid id)
    {
        var doctor = await _context.Doctors.FindAsync(id);

        if (doctor is null || !doctor.IsActive)
            return false;

        doctor.IsActive = false;
        doctor.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}
