public class ResponseCountDto
{
    public Guid QuestionId { get; set; }
    public string QuestionText { get; set; } = null!;
    public int QuestionType { get; set; }
    public Guid AnswerId { get; set; }
    public string AnswerText { get; set; } = null!;
    public int Count { get; set; }
}
