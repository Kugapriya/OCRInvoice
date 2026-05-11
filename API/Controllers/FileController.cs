using API.Models;
using API.Repo;
using API.Dtos;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class FileController : ControllerBase
{

    private CustomerRepository _repo;
    private readonly IConfiguration _config;
    private UploadRepository _upload;
    public FileController(CustomerRepository repo, IConfiguration config, UploadRepository upload)
    {
        _repo = repo;
        _config = config;
        _upload = upload;
    }
    [HttpPost("upload")]
    public async Task<IActionResult> Upload(List<IFormFile> files)
    {
        var invoiceFolderName = "Invoice_" + DateTime.Now.Ticks;

        var invoicePath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "Invoices",
            invoiceFolderName
        );

        Directory.CreateDirectory(invoicePath);

        foreach (var file in files)
        {
            var filePath = Path.Combine(invoicePath, file.FileName);
            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);
        }

        var zipPath = invoicePath + ".zip";

        System.IO.Compression.ZipFile.CreateFromDirectory(invoicePath, zipPath);

        return Ok(new { message = "Invoice folder created & zipped", zipPath });
    }

    // [HttpPost("sendzip/{mailTo}/{CustomerId}/{SupplierName}")]
    // public async Task<IActionResult> SendZip([FromForm] List<IFormFile> files, string mailTo, string CustomerId, string SupplierName)
    // {
    //     try
    //     {
    //         if (files == null || files.Count == 0)
    //             return BadRequest(new { success = false, message = "No files received" });

    //         var result = await _repo.SendZipMail(files, mailTo, CustomerId, SupplierName);

    //         if (!result)
    //             return BadRequest(new { success = false, message = "Mail sending failed" });

    //         return Ok(new { success = true, message = "Mail sent successfully" });
    //     }
    //     catch (Exception ex)
    //     {
    //         return StatusCode(500, new { success = false, message = ex.Message });
    //     }
    // }

    [HttpPost("sendzip/{mailTo}")]
    public async Task<IActionResult> SendZip([FromForm] List<IFormFile> files, string mailTo)
    {
        try
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { success = false, message = "No files received" });

            var result = await _repo.SendZipMail(files, mailTo);

            if (!result)
                return BadRequest(new { success = false, message = "Mail sending failed" });

            return Ok(new { success = true, message = "Mail sent successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("upload/{customerId}")]
    public async Task<IActionResult> UploadFilesWithMetadata(List<IFormFile> files, string customerId, [FromForm] List<string> vendors, [FromForm] List<string> invoiceTypes)
    {
        try
        {
            var savedPaths = await _upload.UploadFilesAsync(files, customerId, vendors ?? new List<string>(), invoiceTypes ?? new List<string>());
            return Ok(new { saved = savedPaths });
        }
        catch (Exception ex)
        {
            return StatusCode(500, "Upload failed: " + ex.Message);
        }
    }
    [HttpGet("getuploadedFiles/{customerId}")]
    public async Task<List<UploadedFiles>> GetUploadedFiles(string customerId)
    {
        return await _upload.GetFilesByCustomerAndSupplierAsync(customerId);
    }

    [HttpGet("getuploadedFileDetails/{customerId}")]
    public async Task<ActionResult<List<InvoiceFileDetailDto>>> GetUploadedFileDetails(string customerId)
    {
        var details = await _upload.GetUploadedFileDetailsAsync(customerId);
        return Ok(details);
    }

    [HttpGet("download/{encodedFilePath}")]
    public IActionResult DownloadFile(string encodedFilePath)
    {
        try
        {
            var decodedBytes = Convert.FromBase64String(encodedFilePath);
            var decodedFilePath = System.Text.Encoding.UTF8.GetString(decodedBytes);
            var fullPath = Path.GetFullPath(decodedFilePath);
            var resolvedFileName = Path.GetFileName(fullPath);

            if (!System.IO.File.Exists(fullPath))
                return NotFound("File not found");

            var mimeType = "application/octet-stream";
            if (resolvedFileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                mimeType = "application/pdf";
            else if (resolvedFileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) || resolvedFileName.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase))
                mimeType = "image/jpeg";
            else if (resolvedFileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
                mimeType = "image/png";

            var bytes = System.IO.File.ReadAllBytes(fullPath);
            return File(bytes, mimeType, resolvedFileName);
        }
        catch (FormatException)
        {
            return BadRequest("Invalid file path encoding");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("preview/{encodedFilePath}")]
    public IActionResult PreviewFile(string encodedFilePath)
    {
        try
        {
            var decodedBytes = Convert.FromBase64String(encodedFilePath);
            var decodedFilePath = System.Text.Encoding.UTF8.GetString(decodedBytes);
            var fullPath = Path.GetFullPath(decodedFilePath);
            var resolvedFileName = Path.GetFileName(fullPath);

            if (!System.IO.File.Exists(fullPath))
                return NotFound("File not found");

            var mimeType = "application/octet-stream";
            if (resolvedFileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                mimeType = "application/pdf";
            else if (resolvedFileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) || resolvedFileName.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase))
                mimeType = "image/jpeg";
            else if (resolvedFileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
                mimeType = "image/png";

            Response.Headers["Content-Disposition"] = $"inline; filename=\"{resolvedFileName}\"";
            var bytes = System.IO.File.ReadAllBytes(fullPath);
            return File(bytes, mimeType);
        }
        catch (FormatException)
        {
            return BadRequest("Invalid file path encoding");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPut("updateLineBarcode/{lineId}")]
    public async Task<IActionResult> UpdateLineBarcode(int lineId, [FromBody] dynamic? request)
    {
        try
        {
            string? barcode = request?.barcode;

            var success = await _upload.UpdateLineBarcodeAsync(lineId, barcode);

            if (!success)
                return NotFound(new { success = false, message = "Line not found." });

            return Ok(new { success = true, message = "Barcode updated successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("getInvoiceLines/{lineIdStart}/{lineIdEnd}")]
    public async Task<ActionResult<List<DocMateInvoiceLineDto>>> GetInvoiceLines(int lineIdStart, int lineIdEnd)
    {
        try
        {
            var lines = await _upload.GetInvoiceLinesAsync(lineIdStart, lineIdEnd);
            return Ok(lines);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}