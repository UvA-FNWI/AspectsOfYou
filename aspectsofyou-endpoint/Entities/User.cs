namespace UvA.AspectsOfYou.Endpoint.Entities;

public class User
{
    public Guid UserId { get; set; }
    public string Username { get; set; }
    public string PasswordHash { get; set; }
    public bool CanCreateSurveys { get; set; }
} 