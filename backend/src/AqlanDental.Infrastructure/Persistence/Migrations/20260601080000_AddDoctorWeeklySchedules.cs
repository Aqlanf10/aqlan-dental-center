using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AqlanDental.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDoctorWeeklySchedules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DoctorWeeklySchedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DayOfWeek = table.Column<int>(type: "INTEGER", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "TEXT", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "TEXT", nullable: false),
                    BreakStartTime = table.Column<TimeOnly>(type: "TEXT", nullable: true),
                    BreakEndTime = table.Column<TimeOnly>(type: "TEXT", nullable: true),
                    DefaultAppointmentDurationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    IsAvailableForBooking = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorWeeklySchedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorWeeklySchedules_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DoctorWeeklySchedules_DayOfWeek",
                table: "DoctorWeeklySchedules",
                column: "DayOfWeek");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorWeeklySchedules_DoctorId",
                table: "DoctorWeeklySchedules",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorWeeklySchedules_IsActive",
                table: "DoctorWeeklySchedules",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorWeeklySchedules_IsAvailableForBooking",
                table: "DoctorWeeklySchedules",
                column: "IsAvailableForBooking");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorWeeklySchedules_DoctorId_DayOfWeek_IsActive",
                table: "DoctorWeeklySchedules",
                columns: new[] { "DoctorId", "DayOfWeek", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DoctorWeeklySchedules");
        }
    }
}
