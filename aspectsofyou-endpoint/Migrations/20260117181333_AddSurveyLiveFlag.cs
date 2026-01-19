using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UvA.AspectsOfYou.Endpoint.Migrations
{
    /// <inheritdoc />
    public partial class AddSurveyLiveFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Live",
                table: "Surveys",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("UPDATE \"Surveys\" SET \"Live\" = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Live",
                table: "Surveys");
        }
    }
}
