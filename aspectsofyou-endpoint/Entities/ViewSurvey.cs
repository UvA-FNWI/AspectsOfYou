using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UvA.AspectsOfYou.Endpoint.Entities
{
    public class ViewSurvey
    {
        [Key]
        public int Id { get; set; }
        [ForeignKey("Survey")]
        public Guid SurveyId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool FunkyBackground { get; set; } = false;
        public bool FunkyColors { get; set; } = false;
        public bool FunkyFont { get; set; } = false;
        public Survey Survey { get; set; } = null!;
        public ICollection<ViewQuestion> ViewQuestions { get; set; } = new List<ViewQuestion>();
    }
}
