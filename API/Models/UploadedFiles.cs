using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models
{
    [Table("UploadedFiles", Schema = "dbo")]
    public class UploadedFiles
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string CustomerId { get; set; } = null!;
        [MaxLength(100)]
        public string? SupplierName { get; set; }
        [Required]
        public string FileName { get; set; } = null!;
        public string? FilePath { get; set; }
        [MaxLength(50)]
        public string? ProcessType { get; set; }
        public DateTime UploadedTime { get; set; }
        public int IsProcess { get; set; }=0;
        public int HeaderId { get; set; }
        public int LineIdStart { get; set; }
        public int LineIdEnd { get; set; }
    }
}