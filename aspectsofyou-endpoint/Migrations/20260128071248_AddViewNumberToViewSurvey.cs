using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UvA.AspectsOfYou.Endpoint.Migrations
{
    /// <inheritdoc />
    public partial class AddViewNumberToViewSurvey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ViewNumber",
                table: "ViewSurveys",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // Update existing records to have ViewNumber = 1
            migrationBuilder.Sql("UPDATE \"ViewSurveys\" SET \"ViewNumber\" = 1 WHERE \"ViewNumber\" = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ViewNumber",
                table: "ViewSurveys");
        }
    }
}
