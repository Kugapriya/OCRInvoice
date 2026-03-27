namespace API.Dtos
{
    public class GoogleFileDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string WebViewLink { get; set; } = "";
        public long Size { get; set; }
    }
}