namespace API.Dtos
{
    public class DocMateInvoiceLineDto
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
        public int? LineNo { get; set; }
        public string? Code { get; set; }
        public string? Description { get; set; }
        public double? CasePack { get; set; }
        public string? UnitSize { get; set; }
        public double? TotalUnits { get; set; }
        public double? Qty { get; set; }
        public double? UnitPrice { get; set; }
        public double? LineNet { get; set; }
        public string? VatCode { get; set; }
        public double? VatRate { get; set; }
        public double? VatAmount { get; set; }
        public double? LineGross { get; set; }
        public double? StdRrp { get; set; }
        public double? Por { get; set; }
        public int? IsVoid { get; set; }
        public string? VoidNote { get; set; }
        public double? Pmp { get; set; }
        public string? Raw { get; set; }
        public string? Barcode { get; set; }
        public decimal? UnitCost { get; set; }
        public bool? Compared { get; set; }
        public bool? Generated { get; set; }
        public bool? StartSync { get; set; }
        public bool? EndSync { get; set; }
        public int OriginalId { get; set; }
        public bool? IsManual { get; set; }
    }
}