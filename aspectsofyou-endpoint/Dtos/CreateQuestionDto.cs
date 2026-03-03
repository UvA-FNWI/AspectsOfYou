namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class CreateQuestionDto
{
    public string QuestionText { get; set; }
    public int QuestionType { get; set; }
    public bool AllowMultipleSelections { get; set; } = false;
    public List<CreateAnswerDto> Answers { get; set; } = new();
}