using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Dtos;
using UvA.AspectsOfYou.Endpoint.Entities;
/*
TODO's: 1. add security

This file describes the API in order to communicate with the database
*/
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactDev",
        policy => policy
            .WithOrigins("http://localhost:3000", "http://localhost:3003")
            .AllowAnyHeader()
            .AllowAnyMethod()
    );
});


builder.Services.AddOpenApi();
builder.Services.AddDbContext<AspectContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("AspectContext")));

var app = builder.Build();

app.UseRouting();

app.UseCors("AllowReactDev");

// Makes the connection to the database more robust (implemented after failing)
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
        Questions = surveyDto.Questions.Select((q, index) => new Question
        {
            QuestionId = Guid.NewGuid(),
            QuestionText = q.QuestionText,
            QuestionType = q.QuestionType,
            OrderIndex = index,
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


/*
TODO: only save the date a user completed the servey

Adds a response of a user to the Responses database
*/
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

/*
Lists all surveys in the database, with their questions and answers
*/
app.MapGet("/api/surveys", async (AspectContext db) =>
{
    var surveys = await db.Surveys
        .Include(s => s.Questions)
            .ThenInclude(q => q.Answers)
        .Select(s => new SurveyDto
        {
            SurveyId = s.SurveyId,
            Title = s.Title,
            // adds questions in order to comply with the DTO interface
            Questions = s.Questions.OrderBy(q => q.OrderIndex).Select(q => new QuestionDto
            {
                QuestionId = q.QuestionId,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                OrderIndex = q.OrderIndex,
                // adds the answers to apply to the questions DTO interface
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

/*
Select a certain survey id.

Same as previous API call, but now with one specific survey
*/
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
            Questions = s.Questions.OrderBy(q => q.OrderIndex).Select(q => new QuestionDto
            {
                QuestionId = q.QuestionId,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                OrderIndex = q.OrderIndex,
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

/*
Returns all responses (of all questions) of a certain survey
*/
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

/*
Returns all responses to a certain question
*/
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


/*
Returns the counts for each question of a survey
*/
app.MapGet("/api/surveys/{surveyId}/responseCounts", async (AspectContext db, Guid surveyId) =>
{
    // handles multiple and open question seperatly
    var multipleChoiceResults = await db.Responses
        .Where(r => r.SurveyId == surveyId)
        .Join(db.Questions, // Joins the responses and questions dataset on the questionID
                r => r.QuestionId,
                q => q.QuestionId,
                (r, q) => new { r, q })
        .Where(rq => rq.q.QuestionType != 2) // Not open questions
        .Join(db.Answers, //Joins the answers dataset on the answerID
                rq => rq.r.AnswerId,
                a => a.AnswerID,
                (rq, a) => new { rq.r, rq.q, a })
        .GroupBy(x => new { // Groups by items which have the exact same answer for the same question
            x.q.QuestionId,
            x.q.QuestionText,
            x.q.OrderIndex,
            x.a.AnswerID,
            x.a.AnswerText
        })
        .Select(g => new ResponseCountDto { // Sums all answers to questions
            QuestionId = g.Key.QuestionId,
            QuestionText = g.Key.QuestionText,
            AnswerId = g.Key.AnswerID,
            AnswerText = g.Key.AnswerText,
            Count = g.Count()
        })
        .OrderBy(r => r.QuestionId)
        .ToListAsync();

    var openEndedResults = await db.Responses
        .Where(r => r.SurveyId == surveyId)
        .Join(db.Questions, // Joins questions and responses DB
                r => r.QuestionId,
                q => q.QuestionId,
                (r, q) => new { r, q })
        .Where(rq => rq.q.QuestionType == 2) // Open ended questions
        .Select(x => new {
            QuestionId = x.q.QuestionId,
            QuestionText = x.q.QuestionText,
            ResponseText = x.r.Additional ?? "No response"
        })
        .GroupBy(x => new { // Groups by same questionid and same responsetext
            x.QuestionId,
            x.QuestionText,
            x.ResponseText
        })
        .Select(g => new ResponseCountDto {
            QuestionId = g.Key.QuestionId,
            QuestionText = g.Key.QuestionText,
            AnswerId = new Guid("00000000-0000-0000-0000-000000000000"), // Ugly, but would've created an error otherwise
            AnswerText = g.Key.ResponseText,
            Count = g.Count() // Counts same occurences of answertexts
        })
        .ToListAsync();

    var questionOrder = await db.Questions
        .Where(q => q.SurveyId == surveyId)
        .Select(q => new { q.QuestionId, q.OrderIndex })
        .ToDictionaryAsync(q => q.QuestionId, q => q.OrderIndex); // Ensures the questions are returned in the order of the survey

    // Combines multiple choise questions with open-ended questions
    var combined = multipleChoiceResults.Concat(openEndedResults)
        .OrderBy(r => questionOrder.ContainsKey(r.QuestionId) ? questionOrder[r.QuestionId] : int.MaxValue)
        .ToList();

    return Results.Ok(combined);
});


app.MapGet("/health", () => Results.Ok("Healthy"));

/*
Deletes a survey from the database
*/
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
    db.Responses.RemoveRange(survey.Responses);

    // Remove related questions and their answers
    foreach (var question in survey.Questions)
    {
        db.Answers.RemoveRange(question.Answers);
        db.Questions.Remove(question);
    }

    // Remove the survey itself
    db.Surveys.Remove(survey);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

app.Run();