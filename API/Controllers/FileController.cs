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
    private OneDriveRepository _oned;
    private UploadRepository _upload;
    public FileController(CustomerRepository repo, IConfiguration config, OneDriveRepository onedrive, UploadRepository upload)
    {
        _repo = repo;
        _config = config;
        _oned = onedrive;
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
    // public async Task<IActionResult> UploadGoogle([FromForm] List<IFormFile> files)
    // {
    //     if (files == null || files.Count == 0)
    //         return BadRequest("No files selected.");

    //     try
    //     {
    //         Console.WriteLine("🚀 Starting Google Drive Upload...");

    //         var keyPath = _config["GoogleDrive:ServiceAccountKeyPath"];

    //         if (string.IsNullOrEmpty(keyPath))
    //         {
    //             Console.WriteLine("❌ Key path not configured.");
    //             return BadRequest("Google Drive key path not configured.");
    //         }

    //         var fullPath = Path.Combine(
    //             Directory.GetCurrentDirectory(),
    //             keyPath
    //         );

    //         Console.WriteLine("🔑 Service Account Path: " + fullPath);

    //         if (!System.IO.File.Exists(fullPath))
    //         {
    //             Console.WriteLine("❌ JSON file not found.");
    //             return BadRequest("Service account JSON file not found.");
    //         }

    //         var credential = GoogleCredential
    //             .FromFile(fullPath)
    //             .CreateScoped(DriveService.Scope.Drive);

    //         var service = new DriveService(new BaseClientService.Initializer()
    //         {
    //             HttpClientInitializer = credential,
    //             ApplicationName = "InvoiceUploader"
    //         });

    //         string folderId = await GetOrCreateFolder(service, "Invoice");

    //         Console.WriteLine("📁 Folder ID: " + folderId);

    //         List<string> uploadedFileIds = new();

    //         foreach (var file in files)
    //         {
    //             if (file.Length == 0)
    //                 continue;

    //             Console.WriteLine("📤 Uploading File: " + file.FileName);
    //             Console.WriteLine("📦 File Size: " + file.Length);

    //             using var stream = file.OpenReadStream();

    //             var fileMetadata = new Google.Apis.Drive.v3.Data.File()
    //             {
    //                 Name = file.FileName,
    //                 Parents = new List<string> { folderId }
    //             };

    //             var request = service.Files.Create(
    //                 fileMetadata,
    //                 stream,
    //                 file.ContentType
    //             );

    //             request.Fields = "id";
    //             request.ChunkSize = ResumableUpload.MinimumChunkSize * 2;

    //             var uploadResult = await request.UploadAsync();

    //             if (uploadResult.Status != UploadStatus.Completed)
    //             {
    //                 Console.WriteLine("❌ Upload Failed");
    //                 Console.WriteLine("Status: " + uploadResult.Status);

    //                 if (uploadResult.Exception != null)
    //                 {
    //                     Console.WriteLine("Exception Message: " + uploadResult.Exception.Message);
    //                     Console.WriteLine("StackTrace: " + uploadResult.Exception.StackTrace);
    //                 }

    //                 return StatusCode(500,
    //                     $"Upload failed for file: {file.FileName}. Reason: {uploadResult.Exception?.Message}");
    //             }

    //             Console.WriteLine("✅ Upload Completed: " + file.FileName);

    //             uploadedFileIds.Add(request.ResponseBody.Id);
    //         }

    //         if (uploadedFileIds.Count == 0)
    //         {
    //             Console.WriteLine("❌ No files uploaded.");
    //             return StatusCode(500, "No files uploaded.");
    //         }

    //         Console.WriteLine("🎉 All files uploaded successfully.");

    //         return Ok(new
    //         {
    //             message = "Files uploaded successfully to Google Drive.",
    //             fileIds = uploadedFileIds
    //         });
    //     }
    //     catch (Exception ex)
    //     {
    //         Console.WriteLine("🔥 GOOGLE UPLOAD ERROR 🔥");
    //         Console.WriteLine("Message: " + ex.Message);
    //         Console.WriteLine("Inner Exception: " + ex.InnerException?.Message);
    //         Console.WriteLine("StackTrace: " + ex.StackTrace);

    //         return StatusCode(500, "Google upload failed: " + ex.Message);
    //     }
    // }

    private async Task<string> GetOrCreateFolder(DriveService service, string folderName)
    {
        var listRequest = service.Files.List();
        listRequest.Q = $"mimeType='application/vnd.google-apps.folder' and name='{folderName}' and trashed=false";
        listRequest.Fields = "files(id, name)";

        var result = await listRequest.ExecuteAsync();

        if (result.Files != null && result.Files.Count > 0)
            return result.Files[0].Id;

        var folderMetadata = new Google.Apis.Drive.v3.Data.File()
        {
            Name = folderName,
            MimeType = "application/vnd.google-apps.folder"
        };

        var folder = await service.Files.Create(folderMetadata).ExecuteAsync();

        return folder.Id;
    }
    [HttpPost("uploadAzure")]
    public async Task<IActionResult> UploadMultiple([FromForm] List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
            return BadRequest("No files selected");

        var urls = await _repo.UploadInvoicesAsync(files);

        return Ok(new { files = urls });
    }

    [HttpPost("uploadgoogle/{customerId}/{supplierName}")]
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
}