namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class QuestionDto
{
    public Guid QuestionId { get; set; }
    public string QuestionText { get; set; }
    public int QuestionType { get; set; }
    public int OrderIndex { get; set; }
    public List<AnswerDto> Answers { get; set; } = new();
}