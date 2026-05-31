using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AqlanDental.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicalProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClinicalProcedures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ClinicalVisitId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProcedureType = table.Column<int>(type: "INTEGER", nullable: false),
                    ToothNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    ToothSurface = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    ClinicalNotes = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicalProcedures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicalProcedures_ClinicalVisits_ClinicalVisitId",
                        column: x => x.ClinicalVisitId,
                        principalTable: "ClinicalVisits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClinicalProcedures_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClinicalProcedures_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalProcedures_ClinicalVisitId",
                table: "ClinicalProcedures",
                column: "ClinicalVisitId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalProcedures_DoctorId",
                table: "ClinicalProcedures",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalProcedures_IsActive",
                table: "ClinicalProcedures",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalProcedures_PatientId",
                table: "ClinicalProcedures",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalProcedures_ProcedureType",
                table: "ClinicalProcedures",
                column: "ProcedureType");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalProcedures_Status",
                table: "ClinicalProcedures",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClinicalProcedures");
        }
    }
}
