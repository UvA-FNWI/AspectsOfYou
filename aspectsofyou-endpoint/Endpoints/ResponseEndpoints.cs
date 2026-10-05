using UvA.AspectsOfYou.Endpoint.Dtos;
using UvA.AspectsOfYou.Endpoint.Entities;
using UvA.AspectsOfYou.Endpoint.Moderation;

namespace UvA.AspectsOfYou.Endpoint.Endpoints;

public static class ResponseEndpoints
{
    public static void MapResponseEndpoints(this WebApplication app, HashSet<string> bannedTerms)
    {
        app.MapPost("/api/responses", async (AspectContext db, CreateResponseDto responseDto) =>
        {
            if (!string.IsNullOrWhiteSpace(responseDto.Additional) &&
                BannedTerms.ContainsBannedPhrase(responseDto.Additional, bannedTerms))
            {
                return Results.BadRequest(new { message = "Additional text contains disallowed terms." });
            }

            var response = new Response
            {
                ResponseId = Guid.NewGuid(),
                Date = DateOnly.FromDateTime(DateTime.UtcNow),
                Additional = responseDto.Additional,
                SurveyId = responseDto.SurveyId,
                QuestionId = responseDto.QuestionId,
                AnswerId = responseDto.AnswerId
            };

            db.Responses.Add(response);
            await db.SaveChangesAsync();

            return Results.Created($"/api/responses/{response.ResponseId}", response.ResponseId);
        });
    }
}
