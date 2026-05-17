using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("UserSessions")]
    public class UserSession
    {
        [Key]
        public long Id { get; set; }

        [Required, StringLength(50)]
        public string Username { get; set; } = "";

        [Required, StringLength(100)]
        public string SessionId { get; set; } = "";

        public DateTime LoginAt { get; set; } = DateTime.Now;

        public DateTime LastHeartbeat { get; set; } = DateTime.Now;

        public DateTime? LogoutAt { get; set; }

        [StringLength(50)]
        public string? IpAddress { get; set; }
    }
}
