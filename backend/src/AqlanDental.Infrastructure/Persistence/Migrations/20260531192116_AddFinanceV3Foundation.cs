using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AqlanDental.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFinanceV3Foundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CashierSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SessionNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    CashierId = table.Column<string>(type: "TEXT", nullable: false),
                    OpeningTime = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ClosingTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    OpeningBalance = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    ExpectedClosingCash = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    ActualClosingCash = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashierSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CashierSessions_AspNetUsers_CashierId",
                        column: x => x.CashierId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Contracts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Specialty = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    RelatedCaseId = table.Column<Guid>(type: "TEXT", nullable: true),
                    TotalAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    DownPayment = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    InstallmentsCount = table.Column<int>(type: "INTEGER", nullable: false),
                    InstallmentAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    DiscountAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    DiscountReason = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contracts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Contracts_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Invoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    VisitId = table.Column<Guid>(type: "TEXT", nullable: true),
                    InvoiceNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Subtotal = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Invoices_ClinicalVisits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "ClinicalVisits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Invoices_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Treasuries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    Balance = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Treasuries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InvoiceLineItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ClinicServiceId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ServiceNameSnapshot = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    TotalPrice = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    LineDiscountAmount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ToothNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvoiceLineItems_ClinicServices_ClinicServiceId",
                        column: x => x.ClinicServiceId,
                        principalTable: "ClinicServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_InvoiceLineItems_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_InvoiceLineItems_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ContractId = table.Column<Guid>(type: "TEXT", nullable: true),
                    InvoiceId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PaymentMethod = table.Column<int>(type: "INTEGER", nullable: false),
                    ServiceDescription = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ReceivedBy = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ReceiptNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Contracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "Contracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Payments_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Payments_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Payments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CashFlowTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TransactionNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    Category = table.Column<int>(type: "INTEGER", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    PaymentMethod = table.Column<int>(type: "INTEGER", nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ReferenceId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ReferenceNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    PerformedBy = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    CashierSessionId = table.Column<Guid>(type: "TEXT", nullable: true),
                    TreasuryId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IsReversal = table.Column<bool>(type: "INTEGER", nullable: false),
                    ReversalOfTransactionId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashFlowTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CashFlowTransactions_CashierSessions_CashierSessionId",
                        column: x => x.CashierSessionId,
                        principalTable: "CashierSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CashFlowTransactions_Treasuries_TreasuryId",
                        column: x => x.TreasuryId,
                        principalTable: "Treasuries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CashFlowTransactions_CashierSessionId",
                table: "CashFlowTransactions",
                column: "CashierSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_CashFlowTransactions_Category",
                table: "CashFlowTransactions",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_CashFlowTransactions_IsActive",
                table: "CashFlowTransactions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_CashFlowTransactions_TransactionDate",
                table: "CashFlowTransactions",
                column: "TransactionDate");

            migrationBuilder.CreateIndex(
                name: "IX_CashFlowTransactions_TransactionNumber",
                table: "CashFlowTransactions",
                column: "TransactionNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CashFlowTransactions_TreasuryId",
                table: "CashFlowTransactions",
                column: "TreasuryId");

            migrationBuilder.CreateIndex(
                name: "IX_CashFlowTransactions_Type",
                table: "CashFlowTransactions",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_CashierSessions_CashierId",
                table: "CashierSessions",
                column: "CashierId");

            migrationBuilder.CreateIndex(
                name: "IX_CashierSessions_IsActive",
                table: "CashierSessions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_CashierSessions_OpeningTime",
                table: "CashierSessions",
                column: "OpeningTime");

            migrationBuilder.CreateIndex(
                name: "IX_CashierSessions_SessionNumber",
                table: "CashierSessions",
                column: "SessionNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CashierSessions_Status",
                table: "CashierSessions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_IsActive",
                table: "Contracts",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_PatientId",
                table: "Contracts",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_StartDate",
                table: "Contracts",
                column: "StartDate");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_Status",
                table: "Contracts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceLineItems_ClinicServiceId",
                table: "InvoiceLineItems",
                column: "ClinicServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceLineItems_DoctorId",
                table: "InvoiceLineItems",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceLineItems_InvoiceId",
                table: "InvoiceLineItems",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceLineItems_IsActive",
                table: "InvoiceLineItems",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_InvoiceNumber",
                table: "Invoices",
                column: "InvoiceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_IsActive",
                table: "Invoices",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_PatientId",
                table: "Invoices",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_Status",
                table: "Invoices",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_VisitId",
                table: "Invoices",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ContractId",
                table: "Payments",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_DoctorId",
                table: "Payments",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_InvoiceId",
                table: "Payments",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_IsActive",
                table: "Payments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_PatientId",
                table: "Payments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_PaymentDate",
                table: "Payments",
                column: "PaymentDate");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_PaymentMethod",
                table: "Payments",
                column: "PaymentMethod");

            migrationBuilder.CreateIndex(
                name: "IX_Treasuries_IsActive",
                table: "Treasuries",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CashFlowTransactions");

            migrationBuilder.DropTable(
                name: "InvoiceLineItems");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "CashierSessions");

            migrationBuilder.DropTable(
                name: "Treasuries");

            migrationBuilder.DropTable(
                name: "Contracts");

            migrationBuilder.DropTable(
                name: "Invoices");
        }
    }
}
