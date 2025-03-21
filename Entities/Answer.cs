using Microsoft.EntityFrameworkCore;

namespace UvA.AspectsOfYou.Endpoint.Entities;

public class Answer
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public int QuestionId { get; set; }
    public int ChoiceId { get; set; }
}