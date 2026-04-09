using System.ComponentModel.DataAnnotations;

namespace API.Models
{
    public class Store
    {
        [Key]
        [StringLength(50)]
        public string StoreId { get; set; } = "";
        [StringLength(100)]
        public string Address { get; set; } = "";
        [StringLength(50)]
        public string City { get; set; } = "";
        [StringLength(50)]
        public string Database { get; set; } = "";
        public int Port { get; set; }
        [StringLength(10)]
        public string PostCode { get; set; } = "";
        [StringLength(50)]
        public string PublicIp { get; set; } = "";
        [StringLength(100)]
        public string StoreName { get; set; } = "";
        [StringLength(250)]
        public string SerialNumber { get; set; } = "";
        [StringLength(100)]
        public string MacAddress { get; set; } = "";
        public DateTime? Tick { get; set; }
        [StringLength(100)]
        public string Servername { get; set; } = "";
        [StringLength(100)]
        public string HostedEnvironment { get; set; } = "";
        [StringLength(20)]
        public string DealerId { get; set; } = "";
        [StringLength(20)]
        public string CustomerId { get; set; } = "";
        public bool IsBlocked { get; set; }
        public virtual ICollection<AssignedStores>? Users { get; set; }
    }
}