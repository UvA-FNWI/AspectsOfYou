using Microsoft.EntityFrameworkCore;

namespace UvA.AspectsOfYou.Endpoint.Entities;

public class AspectContext(DbContextOptions<AspectContext> options) : DbContext(options)
{
    public DbSet<Survey> Surveys { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<Response> Responses { get; set; }
    public DbSet<Answer> Answers { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<ViewSurvey> ViewSurveys { get; set; }
    public DbSet<ViewQuestion> ViewQuestions { get; set; }
    public DbSet<ViewAnswerOption> ViewAnswerOptions { get; set; }
}