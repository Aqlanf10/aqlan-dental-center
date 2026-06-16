# Sprint 21 - Backend API Controllers Agent

## Task ID: sprint21-backend-controllers

## Summary
Created all 12 new API controllers for Sprint 21 (Finance Core / Audit / Dashboard) of the Aqlan Dental Center project. All controllers compile successfully with the existing interface/DTO definitions that were created by a parallel agent.

## Files Created

### Controllers (12 files in `backend/src/AqlanDental.Api/Controllers/`)

1. **JournalEntriesController.cs** — `api/journal-entries`
   - GET `/` — List entries (paged, filterable by documentType, branchId, date range) — Policy: JournalRead
   - GET `/{id}` — Get entry with lines — Policy: JournalRead
   - POST `/` — Create entry — Policy: FinanceWrite
   - Uses `IJournalEntryService`

2. **ExpensesController.cs** — `api/expenses`
   - GET `/` — List expenses (paged, filterable by category, approvalStatus) — Policy: ExpenseRead
   - GET `/pending` — Get pending expenses — Policy: ExpenseRead
   - GET `/{id}` — Get expense — Policy: ExpenseRead
   - POST `/` — Create expense — Policy: ExpenseWrite
   - PUT `/{id}/approve` — Approve expense — Policy: ExpenseApprove
   - PUT `/{id}/reject` — Reject expense — Policy: ExpenseApprove
   - DELETE `/{id}` — Delete expense — Policy: ExpenseWrite
   - Uses `IExpenseService`

3. **VaultTransfersController.cs** — `api/vault-transfers`
   - GET `/` — List transfers (paged, filterable by status) — Policy: VaultTransferRead
   - GET `/{id}` — Get transfer — Policy: VaultTransferRead
   - POST `/` — Create transfer — Policy: VaultTransferWrite
   - PUT `/{id}/approve` — Approve transfer — Policy: VaultTransferApprove
   - PUT `/{id}/reject` — Reject transfer — Policy: VaultTransferApprove
   - Uses `IVaultTransferService`

4. **AuditLogsController.cs** — `api/audit-logs`
   - GET `/` — List audit logs (paged, filterable by userId, resource, action, date range) — Policy: AuditRead
   - Uses `IAuditService` (existing combined interface)

5. **SuppliersController.cs** — `api/suppliers`
   - GET `/` — List suppliers (paged, searchable) — Policy: SupplierRead
   - GET `/{id}` — Get supplier — Policy: SupplierRead
   - POST `/` — Create supplier — Policy: SupplierWrite
   - PUT `/{id}` — Update supplier — Policy: SupplierWrite
   - DELETE `/{id}` — Delete supplier — Policy: SupplierWrite
   - GET `/{id}/statement` — Supplier statement — Policy: SupplierRead
   - Uses `ISupplierService` (combined supplier/PO/bill interface)

6. **PurchaseOrdersController.cs** — `api/purchase-orders`
   - GET `/` — List purchase orders (paged, filterable) — Policy: SupplierRead
   - GET `/{id}` — Get purchase order — Policy: SupplierRead
   - POST `/` — Create purchase order — Policy: SupplierWrite
   - Uses `ISupplierService` (purchase order methods)

7. **SupplierBillsController.cs** — `api/supplier-bills`
   - GET `/` — List bills (paged, filterable) — Policy: SupplierRead
   - GET `/{id}` — Get bill — Policy: SupplierRead
   - POST `/` — Create bill — Policy: SupplierWrite
   - POST `/{id}/pay` — Pay bill — Policy: SupplierWrite
   - Uses `ISupplierService` (bill methods)

8. **CommissionsController.cs** — `api/commissions`
   - GET `/` — List commissions (paged, filterable by doctor, status) — Policy: CommissionRead
   - GET `/{id}` — Get commission — Policy: CommissionRead
   - POST `/calculate` — Calculate commission — Policy: CommissionWrite
   - PUT `/{id}/approve` — Approve commission — Policy: CommissionApprove
   - POST `/{id}/pay` — Pay commission — Policy: CommissionApprove
   - GET `/service-defaults` — Get service commission defaults — Policy: CommissionRead
   - PUT `/service-defaults/{clinicServiceId}` — Update defaults — Policy: CommissionWrite
   - Uses `ICommissionService`

9. **ClinicalPhotosController.cs** — `api/clinical-photos`
   - GET `/patient/{patientId}` — List photos for patient — Policy: PatientRead
   - POST `/patient/{patientId}` — Upload photo (IFormFile) — Policy: PatientWrite
   - DELETE `/{id}` — Delete photo — Policy: PatientWrite
   - Uses `IClinicalPhotoService` (combined photos/radiographs/documents interface)

10. **RadiographsController.cs** — `api/radiographs`
    - GET `/patient/{patientId}` — List radiographs for patient — Policy: PatientRead
    - POST `/patient/{patientId}` — Upload radiograph (IFormFile) — Policy: PatientWrite
    - DELETE `/{id}` — Delete radiograph — Policy: PatientWrite
    - Uses `IClinicalPhotoService` (radiograph methods)

11. **PatientDocumentsController.cs** — `api/patient-documents`
    - GET `/patient/{patientId}` — List documents for patient — Policy: PatientRead
    - POST `/patient/{patientId}` — Upload document (IFormFile) — Policy: PatientWrite
    - DELETE `/{id}` — Delete document — Policy: PatientWrite
    - Uses `IClinicalPhotoService` (document methods)

12. **NotificationsController.cs** — `api/notifications`
    - GET `/` — List current user's notifications (paged) — Policy: NotificationRead
    - GET `/unread-count` — Get unread count — Policy: NotificationRead
    - PUT `/{id}/read` — Mark as read — Policy: NotificationRead
    - PUT `/read-all` — Mark all as read — Policy: NotificationRead
    - DELETE `/{id}` — Delete notification — Policy: NotificationRead
    - Uses `INotificationService`

### Service Implementations (placeholder, in `backend/src/AqlanDental.Infrastructure/Services/`)
- JournalEntryService.cs
- ExpenseService.cs
- VaultTransferService.cs
- CommissionService.cs
- ClinicalPhotoService.cs
- NotificationService.cs
- SupplierService.cs (combined supplier/PO/bill service)

### Authorization Policies Added (in `ServiceCollectionExtensions.cs`)
- JournalRead — Admin, Accountant
- ExpenseRead — Admin, Accountant
- ExpenseWrite — Admin, Accountant
- ExpenseApprove — Admin
- VaultTransferRead — Admin, Accountant
- VaultTransferWrite — Admin, Accountant
- VaultTransferApprove — Admin
- AuditRead — Admin
- SupplierRead — Admin, Accountant
- SupplierWrite — Admin, Accountant
- CommissionRead — Admin, Accountant, Doctor
- CommissionWrite — Admin, Accountant
- CommissionApprove — Admin
- NotificationRead — Admin, Doctor, Reception, Accountant

### DI Registrations Updated (in `DependencyInjection.cs`)
All new services registered as scoped:
- IJournalEntryService → JournalEntryService
- IExpenseService → ExpenseService
- IVaultTransferService → VaultTransferService
- IAuditService → AuditService (existing)
- ISupplierService → SupplierService
- ICommissionService → CommissionService
- IClinicalPhotoService → ClinicalPhotoService
- INotificationService → NotificationService

## Key Architecture Notes
- Controllers are thin, delegating all logic to services
- File upload endpoints (ClinicalPhotos, Radiographs, Documents) accept IFormFile and save to `uploads/` directory structure
- Uses existing combined interfaces (ISupplierService for supplier+PO+bill, IClinicalPhotoService for photos+radiographs+docs)
- All controllers follow the existing project patterns: [ApiController], [Route("api/xxx")], [Authorize(Policy = "Xxx")]
- Build compiles successfully with 0 errors
