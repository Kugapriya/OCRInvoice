namespace API.Dtos
{
    public class DocMateInvoiceHeaderDto
    {
        public int Id { get; set; }
        public string CreatedUtc { get; set; } = string.Empty;
        public string? Filename { get; set; }
        public string? DocType { get; set; }
        public string? SupplierName { get; set; }
        public string? CustomerName { get; set; }
        public string? CmsCustomerId { get; set; }
        public string? DocNumber { get; set; }
        public string? DocDate { get; set; }
        public double? TotalExVat { get; set; }
        public double? TotalVat { get; set; }
        public double? TotalIncVat { get; set; }
        public string? Currency { get; set; }
        public bool? Compared { get; set; }
        public bool? Generated { get; set; }
        public bool? StartSync { get; set; }
        public bool? EndSync { get; set; }
        public int OriginalId { get; set; }
    }
}