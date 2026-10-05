namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class AnswerDto
{
    public Guid AnswerId { get; set; }
    public required string AnswerText { get; set; }
    public bool ExtraText { get; set; }
}