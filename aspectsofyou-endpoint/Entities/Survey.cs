using Microsoft.EntityFrameworkCore;

namespace UvA.AspectsOfYou.Endpoint.Entities;

public class Survey
{
    public Guid SurveyId { get; set; }

    public string Title {get; set; }

    //relations to other tables
    public ICollection<Response> Responses { get; set; } = new List<Response>();
    public ICollection<Question> Questions { get; set; } = new List<Question>();
}