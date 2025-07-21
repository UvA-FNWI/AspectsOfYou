namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class CreateQuestionDto
{
    public string QuestionText { get; set; }
    public int QuestionType { get; set; }
    public List<CreateAnswerDto> Answers { get; set; } = new();
}