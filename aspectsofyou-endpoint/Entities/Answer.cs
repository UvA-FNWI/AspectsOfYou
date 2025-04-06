using Microsoft.EntityFrameworkCore;

namespace UvA.AspectsOfYou.Endpoint.Entities;

public class Answer
{
    public Guid AnswerID { get; set; }
    public string AnswerText { get; set; }
    public bool ExtraText { get; set; }

    // relations with other tables
    public Guid QuestionId { get; set; }
    public Question Question { get; set; }

    public ICollection<Response> Responses { get; set; } = new List<Response>();
}
