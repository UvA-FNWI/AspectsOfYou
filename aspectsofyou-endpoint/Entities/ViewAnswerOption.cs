using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UvA.AspectsOfYou.Endpoint.Entities
{
    public class ViewAnswerOption
    {
        [Key]
        public int Id { get; set; }
        [ForeignKey("ViewQuestion")]
        public int ViewQuestionId { get; set; }
        [ForeignKey("Answer")]
        public Guid AnswerId { get; set; }
        public string Title { get; set; } = string.Empty;
        public ViewQuestion ViewQuestion { get; set; } = null!;
        public Answer Answer { get; set; } = null!;
    }
}
