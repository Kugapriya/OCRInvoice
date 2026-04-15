namespace API.Dtos
{
    public class InvoiceFileDetailDto
    {
        public API.Models.UploadedFiles UploadedFile { get; set; } = null!;
        public DocMateInvoiceHeaderDto? Header { get; set; }
        public List<DocMateInvoiceLineDto> Lines { get; set; } = new();
    }
}