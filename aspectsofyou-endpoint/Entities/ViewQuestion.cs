using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UvA.AspectsOfYou.Endpoint.Entities
{
    public class ViewQuestion
    {
        [Key]
        public int Id { get; set; }
        [ForeignKey("ViewSurvey")]
        public int ViewSurveyId { get; set; }
        [ForeignKey("Question")]
        public Guid QuestionId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string ExcludedAnswerIds { get; set; } = string.Empty; // comma-separated list of excluded answer IDs
        public string ExcludedResponseIds { get; set; } = string.Empty; // comma-separated list of excluded response IDs
        public bool IsExcludedFromView { get; set; } = false;
        public int OrderingId { get; set; }
        [Column("ViewType")]
        public List<string> ViewTypes { get; set; } = new();
        public string? RegionFilter { get; set; }
        public ViewSurvey ViewSurvey { get; set; } = null!;
        public Question Question { get; set; } = null!;
        public ICollection<ViewAnswerOption> ViewAnswerOptions { get; set; } = new List<ViewAnswerOption>();
    }
}
