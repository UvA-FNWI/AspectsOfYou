namespace UvA.AspectsOfYou.Endpoint.Entities;

public class User
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool CanCreateSurveys { get; set; }
} 