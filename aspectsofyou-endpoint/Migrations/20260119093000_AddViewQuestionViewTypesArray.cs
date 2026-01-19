using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using UvA.AspectsOfYou.Endpoint.Entities;

#nullable disable

namespace UvA.AspectsOfYou.Endpoint.Migrations
{
    [DbContext(typeof(AspectContext))]
    [Migration("20260119093000_AddViewQuestionViewTypesArray")]
    public partial class AddViewQuestionViewTypesArray : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"ALTER TABLE ""ViewQuestions"" ALTER COLUMN ""ViewType"" DROP DEFAULT;");

            migrationBuilder.Sql(@"ALTER TABLE ""ViewQuestions""
ALTER COLUMN ""ViewType"" TYPE text[] USING
CASE
    WHEN ""ViewType"" IS NULL THEN ARRAY[]::text[]
    ELSE ARRAY[""ViewType""]
END;");

            migrationBuilder.AlterColumn<List<string>>(
                name: "ViewType",
                table: "ViewQuestions",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>(),
                oldClrType: typeof(string),
                oldType: "text");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"ALTER TABLE ""ViewQuestions"" ALTER COLUMN ""ViewType"" DROP DEFAULT;");

            migrationBuilder.Sql(@"ALTER TABLE ""ViewQuestions""
ALTER COLUMN ""ViewType"" TYPE text USING
CASE
    WHEN ""ViewType"" IS NULL OR array_length(""ViewType"", 1) = 0 THEN 'circleplot'
    ELSE ""ViewType""[1]
END;");

            migrationBuilder.AlterColumn<string>(
                name: "ViewType",
                table: "ViewQuestions",
                type: "text",
                nullable: false,
                oldClrType: typeof(List<string>),
                oldType: "text[]",
                oldDefaultValue: new List<string>());
        }
    }
}
