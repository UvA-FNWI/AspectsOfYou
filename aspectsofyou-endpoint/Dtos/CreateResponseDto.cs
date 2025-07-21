namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class CreateResponseDto
{
    public Guid SurveyId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid AnswerId { get; set; }
    public string? Additional { get; set; }
} 