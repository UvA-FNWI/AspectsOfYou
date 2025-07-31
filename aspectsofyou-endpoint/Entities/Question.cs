using Microsoft.EntityFrameworkCore;

namespace UvA.AspectsOfYou.Endpoint.Entities;

public class Question
{
    public Guid QuestionId { get; set; }
    public string QuestionText { get; set; }

    // 0 -> multiple choice (1 answer), 1-> multiple choice (multiple answers)
    // 2-> open question
    public int QuestionType{ get; set; }
    
    // Order of the question in the survey
    public int OrderIndex { get; set; }

    //relations to other tables
    public Guid SurveyId { get; set; }
    public Survey Survey { get; set; }

    public ICollection<Answer> Answers { get; set; } = new List<Answer>();
    public ICollection<Response> Responses { get; set; } = new List<Response>();
}