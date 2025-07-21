using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Dtos;
using UvA.AspectsOfYou.Endpoint.Entities;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddOpenApi();
builder.Services.AddDbContext<AspectContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("AspectContext")));

// TODO: restrict cors to only the specific backend url!!
// builder.Services.AddCors(options =>
// {
//     options.AddPolicy("AllowNodeBackend", policy =>
//     {
//         policy.AllowAnyOrigin()
//               .AllowAnyMethod()
//               .AllowAnyHeader();
//     });

//     options.AddPolicy("AllowFrontend", policy =>
//     {
//         // ugly and hardcoded, remove later
//         policy.WithOrigins("http://localhost:3000", "http://localhost:3003")
//             .AllowAnyMethod()
//             .AllowAnyHeader()
//             .AllowCredentials();
//     });
// });

var app = builder.Build();


// Use a single, least restrictive CORS policy that allows both frontend and backend requests
// app.UseCors(policy =>
//     policy.WithOrigins("http://localhost:3000", "http://localhost:3003")
//           .AllowAnyMethod()
//           .AllowAnyHeader()
//           .AllowCredentials()
//           .SetIsOriginAllowed(_ => true) // allow all origins for non-credentialed requests
// );

// Modified in order to retry multiple times to connect to the postgresql database.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AspectContext>();
    var retryCount = 0;
    const int maxRetries = 10;

    while (retryCount < maxRetries)
    {
        try
        {
            await db.Database.MigrateAsync();
            break;
        }
        catch (Exception ex)
        {
            retryCount++;
            Console.WriteLine($"Database connection attempt {retryCount} failed: {ex.Message}");
            if (retryCount >= maxRetries)
                throw;
            await Task.Delay(2000 * retryCount);
        }
    }
}

app.MapPost("/api/surveys", async (AspectContext db, CreateSurveyDto surveyDto) =>
{
    var survey = new Survey
    {
        SurveyId = Guid.NewGuid(),
        Title = surveyDto.Title,
        Questions = surveyDto.Questions.Select(q => new Question
        {
            QuestionId = Guid.NewGuid(),
            QuestionText = q.QuestionText,
            QuestionType = q.QuestionType,
            Answers = q.Answers.Select(a => new Answer
            {
                AnswerID = Guid.NewGuid(),
                AnswerText = a.AnswerText,
                ExtraText = a.ExtraText
            }).ToList()
        }).ToList()
    };

    db.Surveys.Add(survey);
    await db.SaveChangesAsync();

    return Results.Created($"/api/surveys/{survey.SurveyId}", survey.SurveyId);
});

// TODO: add point to register answers to questions
app.MapPost("/api/responses", async (AspectContext db, CreateResponseDto responseDto) =>
{
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

app.MapGet("/api/surveys", async (AspectContext db) =>
{
    var surveys = await db.Surveys
        .Include(s => s.Questions)
            .ThenInclude(q => q.Answers)
        .Select(s => new SurveyDto
        {
            SurveyId = s.SurveyId,
            Title = s.Title,
            Questions = s.Questions.Select(q => new QuestionDto
            {
                QuestionId = q.QuestionId,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                Answers = q.Answers.Select(a => new AnswerDto
                {
                    AnswerId = a.AnswerID,
                    AnswerText = a.AnswerText,
                    ExtraText = a.ExtraText
                }).ToList()
            }).ToList()
        })
        .ToListAsync();

    return Results.Ok(surveys);
});

app.MapGet("/api/surveys/{id}", async (AspectContext db, Guid id) =>
{
    var survey = await db.Surveys
        .Include(s => s.Questions)
            .ThenInclude(q => q.Answers)
        .Where(s => s.SurveyId == id)
        .Select(s => new SurveyDto
        {
            SurveyId = s.SurveyId,
            Title = s.Title,
            Questions = s.Questions.Select(q => new QuestionDto
            {
                QuestionId = q.QuestionId,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                Answers = q.Answers.Select(a => new AnswerDto
                {
                    AnswerId = a.AnswerID,
                    AnswerText = a.AnswerText,
                    ExtraText = a.ExtraText
                }).ToList()
            }).ToList()
        })
        .FirstOrDefaultAsync();

    return survey is null ? Results.NotFound() : Results.Ok(survey);
});

app.MapGet("/api/surveys/{surveyId}/responses", async (AspectContext db, Guid surveyId) =>
{
    var responses = await db.Responses
        .Where(r => r.SurveyId == surveyId)
        .Select(r => new ResponseDto
        {
            ResponseId = r.ResponseId,
            Date = r.Date,
            Additional = r.Additional,
            SurveyId = r.SurveyId,
            QuestionId = r.QuestionId,
            AnswerId = r.AnswerId
        })
        .ToListAsync();

    return Results.Ok(responses);
});

// TODO: add point to get all responses for questions
app.MapGet("/api/questions/{questionId}/responses", async (AspectContext db, Guid questionId) =>
{
    var responses = await db.Responses
        .Where(r => r.QuestionId == questionId)
        .Select(r => new ResponseDto
        {
            ResponseId = r.ResponseId,
            Date = r.Date,
            Additional = r.Additional,
            SurveyId = r.SurveyId,
            QuestionId = r.QuestionId,
            AnswerId = r.AnswerId
        })
        .ToListAsync();

    return Results.Ok(responses);
});

app.MapGet("/api/surveys/{surveyId}/responseCounts", async (AspectContext db, Guid surveyId) =>
{
    var grouped = await db.Responses
        // filter to this survey
        .Where(r => r.SurveyId == surveyId)

        // join in the question and answer texts
        .Join(db.Questions,
                r => r.QuestionId,
                q => q.QuestionId,
                (r, q) => new { r, q })
        .Join(db.Answers,
                rq => rq.r.AnswerId,
                a  => a.AnswerID,
                (rq, a) => new { rq.r, rq.q, a })

        // ugly but if I remove question text, it errors
        .GroupBy(
            x => new {
                x.q.QuestionId,
                x.q.QuestionText,
                x.a.AnswerID,
                x.a.AnswerText
            }
        )

        // project into DTO
        .Select(g => new ResponseCountDto {
            QuestionId  = g.Key.QuestionId,
            QuestionText= g.Key.QuestionText,
            AnswerId    = g.Key.AnswerID,
            AnswerText  = g.Key.AnswerText,
            Count       = g.Count()
        })
        .ToListAsync();

    return Results.Ok(grouped);
});


app.MapGet("/health", () => Results.Ok("Healthy"));

app.MapDelete("/api/surveys/delete/{id}", async (AspectContext db, Guid id) =>
{
    Console.WriteLine($"Attempting to delete survey with ID: {id}");

    var survey = await db.Surveys
        .Include(s => s.Questions)
            .ThenInclude(q => q.Answers)
        .Include(s => s.Responses)
        .FirstOrDefaultAsync(s => s.SurveyId == id);

    if (survey is null)
    {
        Console.WriteLine($"Survey with ID {id} not found.");
        return Results.NotFound(new { message = "Survey not found" });
    }

    Console.WriteLine($"Found survey with ID {id}. Deleting related entities...");

    // Remove related responses
    // db.Responses.RemoveRange(survey.Responses);

    // // Remove related questions and their answers
    // foreach (var question in survey.Questions)
    // {
    //     db.Answers.RemoveRange(question.Answers);
    //     db.Questions.Remove(question);
    // }

    // Remove the survey itself
    db.Surveys.Remove(survey);
    await db.SaveChangesAsync();

    // Console.WriteLine($"Successfully deleted survey with ID {id}.");
    return Results.NoContent();
});

app.Run();