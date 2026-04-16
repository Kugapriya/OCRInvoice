using API.Models;
using API.Repo;
using API.Dtos;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Upload;
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

    [HttpPost("upload/{customerId}/{supplierName}")]
    public async Task<IActionResult> UploadFiles(List<IFormFile> files, string customerId, string supplierName)
    {
        try
        {
            var savedPaths = await _upload.UploadFilesAsync(files, customerId, supplierName);
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

    [HttpGet("download/{customerId}/{supplier}/{fileName}")]
    public IActionResult DownloadFile(string customerId, string supplier, string fileName)
    {
        var basePath = Path.GetFullPath(@"E:\Invoice");
        var basePathWithSeparator = basePath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        var fullPath = Path.GetFullPath(Path.Combine(basePath, customerId, supplier, fileName));
        var resolvedFileName = Path.GetFileName(fullPath);

        if (!fullPath.StartsWith(basePathWithSeparator, StringComparison.OrdinalIgnoreCase))
            return BadRequest("Invalid path");

        if (!System.IO.File.Exists(fullPath))
            return NotFound("File not found");

        var mimeType = "application/octet-stream";
        if (resolvedFileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            mimeType = "application/pdf";
        else if (resolvedFileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) || resolvedFileName.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) || resolvedFileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
            mimeType = "image/jpeg";

        var bytes = System.IO.File.ReadAllBytes(fullPath);
        return File(bytes, mimeType, resolvedFileName);
    }

    [HttpGet("preview/{customerId}/{supplier}/{fileName}")]
    public IActionResult PreviewFile(string customerId, string supplier, string fileName)
    {
        var basePath = Path.GetFullPath(@"E:\Invoice");
        var basePathWithSeparator = basePath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        var fullPath = Path.GetFullPath(Path.Combine(basePath, customerId, supplier, fileName));
        var resolvedFileName = Path.GetFileName(fullPath);

        if (!fullPath.StartsWith(basePathWithSeparator, StringComparison.OrdinalIgnoreCase))
            return BadRequest("Invalid path");

        if (!System.IO.File.Exists(fullPath))
            return NotFound("File not found");

        var mimeType = "application/octet-stream";
        if (resolvedFileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            mimeType = "application/pdf";
        else if (resolvedFileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) || resolvedFileName.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) || resolvedFileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
            mimeType = "image/jpeg";

        var bytes = System.IO.File.ReadAllBytes(fullPath);
        return File(bytes, mimeType);
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