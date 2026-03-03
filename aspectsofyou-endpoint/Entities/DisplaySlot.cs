using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UvA.AspectsOfYou.Endpoint.Entities
{
    public class DisplaySlot
    {
        [Key]
        public int Id { get; set; }
        
        /// <summary>
        /// Slot identifier: "fillin", "display1", "display2", "display3"
        /// </summary>
        public string SlotName { get; set; } = string.Empty;
        
        /// <summary>
        /// The survey assigned to this slot (nullable if no survey assigned)
        /// </summary>
        public Guid? SurveyId { get; set; }
        
        /// <summary>
        /// The view assigned to this slot (only used for display slots, not fillin)
        /// </summary>
        public int? ViewId { get; set; }
        
        /// <summary>
        /// Navigation property to the survey
        /// </summary>
        [ForeignKey("SurveyId")]
        public Survey? Survey { get; set; }
        
        /// <summary>
        /// Navigation property to the view
        /// </summary>
        [ForeignKey("ViewId")]
        public ViewSurvey? ViewSurvey { get; set; }
    }
}
