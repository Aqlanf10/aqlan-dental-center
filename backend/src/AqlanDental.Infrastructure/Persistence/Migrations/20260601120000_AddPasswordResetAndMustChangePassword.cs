using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AqlanDental.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AddPasswordResetAndMustChangePassword : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "MustChangePassword",
            table: "AspNetUsers",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.CreateTable(
            name: "PasswordResetTokens",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<string>(type: "text", nullable: false),
                Token = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "PasswordResetTokens");

        migrationBuilder.DropColumn(
            name: "MustChangePassword",
            table: "AspNetUsers");
    }
}
