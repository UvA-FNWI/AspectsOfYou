using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Dtos;
using UvA.AspectsOfYou.Endpoint.Entities;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddDbContext<AspectContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("AspectContext")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<AspectContext>().Database.MigrateAsync();

app.MapPost("/api/answers", async (AspectContext db, AnswerDto ans) =>
{
    db.Answers.Add(new Answer
    {
        Id = Guid.NewGuid(),
        Date = DateOnly.FromDateTime(DateTime.Now),
        QuestionId = ans.QuestionId,
        ChoiceId = ans.ChoiceId
    });
    await db.SaveChangesAsync();
});

app.MapGet("/api/answerSummary", async (AspectContext db) =>
{
    return await db.Answers
        .GroupBy(a => new {a.QuestionId, a.ChoiceId, a.Date})
        .Select(g => new
        {
            g.Key.Date,
            g.Key.QuestionId,
            g.Key.ChoiceId,
            Count = g.Count()
        })
        .ToListAsync();
});

app.Run();