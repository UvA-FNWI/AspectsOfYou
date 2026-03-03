namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class SurveyDto
{
    public Guid SurveyId { get; set; }
    public string Title { get; set; }
    public bool Live { get; set; }
    public bool Editing { get; set; }
    public List<QuestionDto> Questions { get; set; } = new();
    public List<ViewSummaryDto> Views { get; set; } = new();
}

public class ViewSummaryDto
{
    public int Id { get; set; }
    public int ViewNumber { get; set; }
    public string Title { get; set; } = string.Empty;
}