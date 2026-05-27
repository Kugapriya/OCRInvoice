namespace API.Dtos
{
    public class FileSummaryDto
    {
        public int Id { get; set; }
        public string FileName { get; set; } = "";
        public string? SupplierName { get; set; }
        public string InvoiceNumber { get; set; } = "";
        public string InvoiceDate { get; set; } = "";
        public DateTime UploadedTime { get; set; }
        public string? ProcessType { get; set; }
        public int IsProcess { get; set; }
        public int TotalLines { get; set; }
        public int NoBarcodeCount { get; set; }
    }
}
