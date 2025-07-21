namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class ResponseDto
{
    public Guid ResponseId { get; set; }
    public DateOnly Date { get; set; }
    public string? Additional { get; set; }
    public Guid SurveyId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid AnswerId { get; set; }
} 