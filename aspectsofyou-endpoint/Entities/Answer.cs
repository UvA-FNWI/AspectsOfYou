using Microsoft.EntityFrameworkCore;

namespace UvA.AspectsOfYou.Endpoint.Entities;

public class Answer
{
    public Guid AnswerID { get; set; }
    public string AnswerText { get; set; } = string.Empty;
    public bool ExtraText { get; set; } = false;

    // relations with other tables
    public Guid QuestionId { get; set; }
    public Question Question { get; set; } = null!;

    public ICollection<Response> Responses { get; set; } = new List<Response>();
}
