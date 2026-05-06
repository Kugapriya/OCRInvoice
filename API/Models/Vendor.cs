using System.ComponentModel.DataAnnotations;

namespace API.Models
{
    public class Vendor
    {
        [Key]
        public int ID { get; set; }

        [Required]
        [StringLength(255)]
        public string SupplierName { get; set; } = "";

        [StringLength(255)]
        public string? ContactName { get; set; }

        [StringLength(500)]
        public string? Address1 { get; set; }

        [StringLength(100)]
        public string? City { get; set; }

        [StringLength(50)]
        public string? MobileNumber { get; set; }

        [StringLength(255)]
        public string? Email { get; set; }
    }
}
