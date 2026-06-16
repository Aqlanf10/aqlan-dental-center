using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;

namespace AqlanDental.Infrastructure.Services;

public class ClinicalPhotoService : IClinicalPhotoService
{
    // Clinical Photos
    public Task<ClinicalPhotoDto> UploadPhotoAsync(UploadClinicalPhotoRequest request)
        => throw new NotImplementedException();

    public Task<PagedResult<ClinicalPhotoDto>> GetPhotosByPatientAsync(Guid patientId, int page, int pageSize, int? category)
        => Task.FromResult(new PagedResult<ClinicalPhotoDto>([], 0, page, pageSize, 0));

    public Task<bool> DeletePhotoAsync(Guid id)
        => Task.FromResult(false);

    // Radiographs
    public Task<RadiographDto> UploadRadiographAsync(UploadRadiographRequest request)
        => throw new NotImplementedException();

    public Task<PagedResult<RadiographDto>> GetRadiographsByPatientAsync(Guid patientId, int page, int pageSize, int? xrayType)
        => Task.FromResult(new PagedResult<RadiographDto>([], 0, page, pageSize, 0));

    public Task<bool> DeleteRadiographAsync(Guid id)
        => Task.FromResult(false);

    // Patient Documents
    public Task<PatientDocumentDto> UploadDocumentAsync(UploadPatientDocumentRequest request)
        => throw new NotImplementedException();

    public Task<PagedResult<PatientDocumentDto>> GetDocumentsByPatientAsync(Guid patientId, int page, int pageSize, int? documentType)
        => Task.FromResult(new PagedResult<PatientDocumentDto>([], 0, page, pageSize, 0));

    public Task<bool> DeleteDocumentAsync(Guid id)
        => Task.FromResult(false);

    public Task<PatientDocumentDto?> SignDocumentAsync(Guid id)
        => Task.FromResult<PatientDocumentDto?>(null);
}
