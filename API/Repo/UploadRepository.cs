using System.Globalization;
using API;
using API.Models;

public class UploadRepository
{
    private readonly string connectionString;
    private readonly IConfiguration _config;

    public UploadRepository(IConfiguration config)
    {
        _config = config;
        connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string not configured.");
    }

    public async Task<List<string>> UploadFilesAsync(List<IFormFile> files, string customerId, string supplierName)
    {
        string _baseRoot = @"E:\Invoice";
        //string _baseRoot = Path.Combine(AppContext.BaseDirectory, "Invoice");
        UploadDA ob = new UploadDA(connectionString);
        var customerFolder = Path.Combine(_baseRoot, customerId);
        var supplierFolder = Path.Combine(customerFolder, supplierName);
        Directory.CreateDirectory(supplierFolder);

        var savedPaths = new List<string>();

        foreach (var file in files)
        {
            if (file == null || file.Length == 0)
                continue;

            var timestamp = DateTime.Now.ToString("yyyy_MM_dd_HH_mm_ss_fff", CultureInfo.InvariantCulture);
            var ext = Path.GetExtension(file.FileName) ?? "";
            var fileName = $"{customerId}_{timestamp}_{supplierName}{ext}";
            var fullPath = Path.Combine(supplierFolder, fileName);

            await using (var stream = File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            savedPaths.Add(fullPath);

            await ob.InsertUploadRecordAsync(customerId, supplierName, fileName, fullPath, "");
        }

        return savedPaths;
    }

    public async Task<List<UploadedFiles>> GetFilesByCustomerAndSupplierAsync(string customerId)
    {
        UploadDA ob = new UploadDA(connectionString);
        return await ob.GetFilesByCustomerAndSupplierAsync(customerId);
    }
}