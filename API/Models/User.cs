using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("Users")]
    public class User
    {
        [StringLength(50)]
        [Key]
        public string Username { get; set; } = "";
        [StringLength(50)]
        public string? Password { get; set; }
        [StringLength(50)]
        public string? Name { get; set; }
        [StringLength(50)]
        public string? Address1 { get; set; }
        [StringLength(50)]
        public string? Address2 { get; set; }
        [StringLength(50)]
        public string? City { get; set; }
        [StringLength(20)]
        public string? Telephone { get; set; }
        [StringLength(50)]
        public string? Email { get; set; }
        [StringLength(20)]
        public string? Role { get; set; }
        public bool IsSuperUser { get; set; }
        [StringLength(20)]
        public string? DealerId { get; set; }
        [StringLength(20)]
        public string? Theme { get; set; }
        // [StringLength(20)]
        // public string CustomerId{get;set;}="";
        [StringLength(50)]
        public string? AccessLevel { get; set; }
        public virtual ICollection<AssignedStores>? Stores { get; set; }
    }
}