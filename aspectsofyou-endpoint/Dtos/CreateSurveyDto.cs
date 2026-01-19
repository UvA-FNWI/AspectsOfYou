namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class CreateSurveyDto
{
    public string Title { get; set; }
    public bool Live { get; set; } = false;
    public bool Editing { get; set; } = true;
    public List<CreateQuestionDto> Questions { get; set; } = new();
}