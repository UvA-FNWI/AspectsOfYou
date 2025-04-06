using Microsoft.EntityFrameworkCore;

namespace UvA.AspectsOfYou.Endpoint.Entities;

public class Response
{
    public Guid ResponseId { get; set; }
    public DateOnly Date { get; set; }

    public string? Additional {get; set; }

    //relations to other tables
    public Guid SurveyId { get; set; }
    public Survey Survey { get; set; }

    public Guid QuestionId { get; set; }
    public Question Question { get; set; }

    public Guid AnswerId { get; set; }
    public Answer Answer { get; set; }
}