using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("UserActivityLogs")]
    public class UserActivityLog
    {
        [Key]
        public long Id { get; set; }

        [Required, StringLength(50)]
        public string Username { get; set; } = "";

        // login | logout | upload_success | upload_failed | page_view | heartbeat
        [Required, StringLength(50)]
        public string ActivityType { get; set; } = "";

        [StringLength(500)]
        public string? ActivityDetail { get; set; }

        [StringLength(50)]
        public string? CustomerId { get; set; }

        [StringLength(50)]
        public string? IpAddress { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
