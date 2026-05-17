namespace API.Dtos
{
    public class LogActivityDto
    {
        public string ActivityType { get; set; } = "";
        public string? Detail { get; set; }
        public string? CustomerId { get; set; }
    }
}
