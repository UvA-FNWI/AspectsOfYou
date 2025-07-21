namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class CreateSurveyDto
{
    public string Title { get; set; }
    public List<CreateQuestionDto> Questions { get; set; } = new();
}