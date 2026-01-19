using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UvA.AspectsOfYou.Endpoint.Migrations
{
    /// <inheritdoc />
    public partial class AddFunkySettingsToViewSurvey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "FunkyBackground",
                table: "ViewSurveys",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "FunkyColors",
                table: "ViewSurveys",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "FunkyFont",
                table: "ViewSurveys",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FunkyBackground",
                table: "ViewSurveys");

            migrationBuilder.DropColumn(
                name: "FunkyColors",
                table: "ViewSurveys");

            migrationBuilder.DropColumn(
                name: "FunkyFont",
                table: "ViewSurveys");
        }
    }
}
