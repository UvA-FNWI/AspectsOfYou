namespace UvA.AspectsOfYou.Endpoint.Dtos;

public class CreateAnswerDto
{
    public required string AnswerText { get; set; }
    public bool ExtraText { get; set; }
}