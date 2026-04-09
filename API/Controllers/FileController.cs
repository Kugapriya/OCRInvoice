using API.Models;
using API.Repo;
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

    [HttpPost("sendzip/{mailTo}/{CustomerId}/{SupplierName}")]
    public async Task<IActionResult> SendZip(List<IFormFile> files, string mailTo, string CustomerId, string SupplierName)
    {
        var result = await _repo.SendZipMail(files, mailTo, CustomerId, SupplierName);

        return Ok(new { success = result });
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

    [HttpGet("download/{customerId}/{supplier}/{fileName}")]
    public IActionResult DownloadFile(string customerId, string supplier, string fileName)
    {
        var basePath = @"E:\Invoice";

        var filePath = Path.Combine(basePath, customerId, supplier, fileName);

        if (!filePath.StartsWith(basePath))
            return BadRequest("Invalid path");

        if (!System.IO.File.Exists(filePath))
            return NotFound("File not found");

        var mimeType = "application/octet-stream";
        if (fileName.EndsWith(".pdf"))
            mimeType = "application/pdf";
        else if (fileName.EndsWith(".jpg") || fileName.EndsWith(".jpeg") || fileName.EndsWith(".png"))
            mimeType = "image/jpeg";

        var bytes = System.IO.File.ReadAllBytes(filePath);
        return File(bytes, mimeType, fileName);
    }
}