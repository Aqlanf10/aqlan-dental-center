using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AqlanDental.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSprint21FinanceCoreAuditEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                table: "AspNetUsers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    Action = table.Column<int>(type: "INTEGER", nullable: false),
                    Resource = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ResourceId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IpAddress = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Details = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    NewData = table.Column<string>(type: "TEXT", nullable: true),
                    OldData = table.Column<string>(type: "TEXT", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ClinicalPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    OrthoCaseId = table.Column<Guid>(type: "TEXT", nullable: true),
                    FileUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Category = table.Column<int>(type: "INTEGER", nullable: false),
                    PhotoType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Stage = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    PhotoDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Caption = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicalPhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicalPhotos_OrthoCases_OrthoCaseId",
                        column: x => x.OrthoCaseId,
                        principalTable: "OrthoCases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClinicalPhotos_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DoctorCommissionPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    InvoiceLineItemId = table.Column<Guid>(type: "TEXT", nullable: true),
                    TotalPrice = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    MaterialCost = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    LabCost = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    NetCommissionable = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    CommissionPercentage = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                    CommissionAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ApprovedBy = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CashFlowTransactionId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorCommissionPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorCommissionPayments_CashFlowTransactions_CashFlowTransactionId",
                        column: x => x.CashFlowTransactionId,
                        principalTable: "CashFlowTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DoctorCommissionPayments_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DoctorCommissionPayments_InvoiceLineItems_InvoiceLineItemId",
                        column: x => x.InvoiceLineItemId,
                        principalTable: "InvoiceLineItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "JournalEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    EntryNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    DocumentType = table.Column<int>(type: "INTEGER", nullable: false),
                    FinancialDocumentId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    EntryDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    BranchId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PerformedBy = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    CashierSessionId = table.Column<Guid>(type: "TEXT", nullable: true),
                    TreasuryId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IsPosted = table.Column<bool>(type: "INTEGER", nullable: false),
                    PostedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsReversal = table.Column<bool>(type: "INTEGER", nullable: false),
                    ReversalOfEntryId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ReversedByEntryId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JournalEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JournalEntries_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_JournalEntries_CashierSessions_CashierSessionId",
                        column: x => x.CashierSessionId,
                        principalTable: "CashierSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_JournalEntries_Treasuries_TreasuryId",
                        column: x => x.TreasuryId,
                        principalTable: "Treasuries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Message = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    Link = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    IsRead = table.Column<bool>(type: "INTEGER", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PasswordResetTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    Token = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    IsUsed = table.Column<bool>(type: "INTEGER", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordResetTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PasswordResetTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    DocumentType = table.Column<int>(type: "INTEGER", nullable: false),
                    FileUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    FileName = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    FileSize = table.Column<long>(type: "INTEGER", nullable: true),
                    MimeType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    IsSigned = table.Column<bool>(type: "INTEGER", nullable: false),
                    SignedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientDocuments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Radiographs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FileUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    XrayType = table.Column<int>(type: "INTEGER", nullable: false),
                    FileName = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    FileSize = table.Column<long>(type: "INTEGER", nullable: true),
                    MimeType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    ToothRelated = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    XrayDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Radiographs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Radiographs_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Radiographs_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ContactPerson = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Phone = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Address = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Balance = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JournalLines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    JournalEntryId = table.Column<Guid>(type: "TEXT", nullable: false),
                    AccountType = table.Column<int>(type: "INTEGER", nullable: false),
                    AccountId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Debit = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    Credit = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    BranchId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JournalLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JournalLines_JournalEntries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "JournalEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OperationalExpenses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ExpenseNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Category = table.Column<int>(type: "INTEGER", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    PaymentMethod = table.Column<int>(type: "INTEGER", nullable: false),
                    SupplierName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    LabOrderId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ReceiptAttachmentUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    ApprovalStatus = table.Column<int>(type: "INTEGER", nullable: false),
                    ApprovedBy = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    RejectionReason = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    IsPostedToLedger = table.Column<bool>(type: "INTEGER", nullable: false),
                    CashFlowTransactionId = table.Column<Guid>(type: "TEXT", nullable: true),
                    JournalEntryId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CashierSessionId = table.Column<Guid>(type: "TEXT", nullable: true),
                    TreasuryId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationalExpenses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OperationalExpenses_CashFlowTransactions_CashFlowTransactionId",
                        column: x => x.CashFlowTransactionId,
                        principalTable: "CashFlowTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OperationalExpenses_CashierSessions_CashierSessionId",
                        column: x => x.CashierSessionId,
                        principalTable: "CashierSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OperationalExpenses_JournalEntries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "JournalEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OperationalExpenses_LabOrders_LabOrderId",
                        column: x => x.LabOrderId,
                        principalTable: "LabOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OperationalExpenses_Treasuries_TreasuryId",
                        column: x => x.TreasuryId,
                        principalTable: "Treasuries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "VaultTransfers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TransferNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SourceTreasuryId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DestinationTreasuryId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    DepositSource = table.Column<int>(type: "INTEGER", nullable: true),
                    DepositSourceDescription = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CashierSessionId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ApprovedBy = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    RejectionReason = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CashFlowTransactionId = table.Column<Guid>(type: "TEXT", nullable: true),
                    JournalEntryId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VaultTransfers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VaultTransfers_CashFlowTransactions_CashFlowTransactionId",
                        column: x => x.CashFlowTransactionId,
                        principalTable: "CashFlowTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VaultTransfers_CashierSessions_CashierSessionId",
                        column: x => x.CashierSessionId,
                        principalTable: "CashierSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VaultTransfers_JournalEntries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "JournalEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VaultTransfers_Treasuries_DestinationTreasuryId",
                        column: x => x.DestinationTreasuryId,
                        principalTable: "Treasuries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VaultTransfers_Treasuries_SourceTreasuryId",
                        column: x => x.SourceTreasuryId,
                        principalTable: "Treasuries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OrderNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SupplierId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Subtotal = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrders_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SupplierBills",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BillNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SupplierId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    PaidAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    DueDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierBills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierBills_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrderLineItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "TEXT", nullable: false),
                    InventoryItemId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ItemName = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false),
                    ReceivedQuantity = table.Column<int>(type: "INTEGER", nullable: false),
                    UnitCost = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    TotalCost = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderLineItems_InventoryItems_InventoryItemId",
                        column: x => x.InventoryItemId,
                        principalTable: "InventoryItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderLineItems_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupplierBillPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SupplierBillId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    PaymentMethod = table.Column<int>(type: "INTEGER", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TreasuryId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ReferenceNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierBillPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierBillPayments_SupplierBills_SupplierBillId",
                        column: x => x.SupplierBillId,
                        principalTable: "SupplierBills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SupplierBillPayments_Treasuries_TreasuryId",
                        column: x => x.TreasuryId,
                        principalTable: "Treasuries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Action",
                table: "AuditLogs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Resource",
                table: "AuditLogs",
                column: "Resource");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ResourceId",
                table: "AuditLogs",
                column: "ResourceId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Timestamp",
                table: "AuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalPhotos_Category",
                table: "ClinicalPhotos",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalPhotos_IsActive",
                table: "ClinicalPhotos",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalPhotos_OrthoCaseId",
                table: "ClinicalPhotos",
                column: "OrthoCaseId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalPhotos_PatientId",
                table: "ClinicalPhotos",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorCommissionPayments_CashFlowTransactionId",
                table: "DoctorCommissionPayments",
                column: "CashFlowTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorCommissionPayments_DoctorId",
                table: "DoctorCommissionPayments",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorCommissionPayments_InvoiceLineItemId",
                table: "DoctorCommissionPayments",
                column: "InvoiceLineItemId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorCommissionPayments_IsActive",
                table: "DoctorCommissionPayments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorCommissionPayments_Status",
                table: "DoctorCommissionPayments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_BranchId",
                table: "JournalEntries",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_CashierSessionId",
                table: "JournalEntries",
                column: "CashierSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_DocumentType",
                table: "JournalEntries",
                column: "DocumentType");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_EntryDate",
                table: "JournalEntries",
                column: "EntryDate");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_EntryNumber",
                table: "JournalEntries",
                column: "EntryNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_IsActive",
                table: "JournalEntries",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_IsPosted",
                table: "JournalEntries",
                column: "IsPosted");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_TreasuryId",
                table: "JournalEntries",
                column: "TreasuryId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalLines_AccountType",
                table: "JournalLines",
                column: "AccountType");

            migrationBuilder.CreateIndex(
                name: "IX_JournalLines_BranchId",
                table: "JournalLines",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalLines_IsActive",
                table: "JournalLines",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_JournalLines_JournalEntryId",
                table: "JournalLines",
                column: "JournalEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_IsRead",
                table: "Notifications",
                column: "IsRead");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_Type",
                table: "Notifications",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalExpenses_ApprovalStatus",
                table: "OperationalExpenses",
                column: "ApprovalStatus");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalExpenses_CashFlowTransactionId",
                table: "OperationalExpenses",
                column: "CashFlowTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalExpenses_CashierSessionId",
                table: "OperationalExpenses",
                column: "CashierSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalExpenses_Category",
                table: "OperationalExpenses",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalExpenses_ExpenseNumber",
                table: "OperationalExpenses",
                column: "ExpenseNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OperationalExpenses_IsActive",
                table: "OperationalExpenses",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalExpenses_JournalEntryId",
                table: "OperationalExpenses",
                column: "JournalEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalExpenses_LabOrderId",
                table: "OperationalExpenses",
                column: "LabOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalExpenses_TreasuryId",
                table: "OperationalExpenses",
                column: "TreasuryId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_ExpiresAt",
                table: "PasswordResetTokens",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_Token",
                table: "PasswordResetTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_UserId",
                table: "PasswordResetTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDocuments_DocumentType",
                table: "PatientDocuments",
                column: "DocumentType");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDocuments_IsActive",
                table: "PatientDocuments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_PatientDocuments_PatientId",
                table: "PatientDocuments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderLineItems_InventoryItemId",
                table: "PurchaseOrderLineItems",
                column: "InventoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderLineItems_IsActive",
                table: "PurchaseOrderLineItems",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderLineItems_PurchaseOrderId",
                table: "PurchaseOrderLineItems",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_IsActive",
                table: "PurchaseOrders",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_OrderNumber",
                table: "PurchaseOrders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_Status",
                table: "PurchaseOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_SupplierId",
                table: "PurchaseOrders",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Radiographs_DoctorId",
                table: "Radiographs",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_Radiographs_IsActive",
                table: "Radiographs",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Radiographs_PatientId",
                table: "Radiographs",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Radiographs_XrayType",
                table: "Radiographs",
                column: "XrayType");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierBillPayments_IsActive",
                table: "SupplierBillPayments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierBillPayments_SupplierBillId",
                table: "SupplierBillPayments",
                column: "SupplierBillId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierBillPayments_TreasuryId",
                table: "SupplierBillPayments",
                column: "TreasuryId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierBills_BillNumber",
                table: "SupplierBills",
                column: "BillNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupplierBills_IsActive",
                table: "SupplierBills",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierBills_Status",
                table: "SupplierBills",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierBills_SupplierId",
                table: "SupplierBills",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_IsActive",
                table: "Suppliers",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_Name",
                table: "Suppliers",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_VaultTransfers_CashFlowTransactionId",
                table: "VaultTransfers",
                column: "CashFlowTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_VaultTransfers_CashierSessionId",
                table: "VaultTransfers",
                column: "CashierSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_VaultTransfers_DestinationTreasuryId",
                table: "VaultTransfers",
                column: "DestinationTreasuryId");

            migrationBuilder.CreateIndex(
                name: "IX_VaultTransfers_IsActive",
                table: "VaultTransfers",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_VaultTransfers_JournalEntryId",
                table: "VaultTransfers",
                column: "JournalEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_VaultTransfers_SourceTreasuryId",
                table: "VaultTransfers",
                column: "SourceTreasuryId");

            migrationBuilder.CreateIndex(
                name: "IX_VaultTransfers_Status",
                table: "VaultTransfers",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_VaultTransfers_TransferNumber",
                table: "VaultTransfers",
                column: "TransferNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "ClinicalPhotos");

            migrationBuilder.DropTable(
                name: "DoctorCommissionPayments");

            migrationBuilder.DropTable(
                name: "JournalLines");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "OperationalExpenses");

            migrationBuilder.DropTable(
                name: "PasswordResetTokens");

            migrationBuilder.DropTable(
                name: "PatientDocuments");

            migrationBuilder.DropTable(
                name: "PurchaseOrderLineItems");

            migrationBuilder.DropTable(
                name: "Radiographs");

            migrationBuilder.DropTable(
                name: "SupplierBillPayments");

            migrationBuilder.DropTable(
                name: "VaultTransfers");

            migrationBuilder.DropTable(
                name: "PurchaseOrders");

            migrationBuilder.DropTable(
                name: "SupplierBills");

            migrationBuilder.DropTable(
                name: "JournalEntries");

            migrationBuilder.DropTable(
                name: "Suppliers");

            migrationBuilder.DropColumn(
                name: "MustChangePassword",
                table: "AspNetUsers");
        }
    }
}
