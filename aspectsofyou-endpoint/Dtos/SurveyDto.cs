namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class SurveyDto
{
    public Guid SurveyId { get; set; }
    public string Title { get; set; }
    public List<QuestionDto> Questions { get; set; } = new();
}