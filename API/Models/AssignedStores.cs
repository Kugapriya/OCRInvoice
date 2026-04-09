namespace API.Models
{
    public class AssignedStores
    {
        public string Username { get; set; } = "";
        public virtual User? User { get; set; }
        public string StoreId { get; set; } = "";
        public virtual Store? Store { get; set; }
    }
}