using System.IO.Compression;
using System.Net;
using System.Net.Mail;
using API.DataAccess;
using API.Dtos;
using Azure.Storage.Blobs;
using Microsoft.EntityFrameworkCore;

namespace API.Repo
{
    public class CustomerRepository
    {
        public readonly IConfiguration _config;
        public DataContext _context;
        private readonly string connectionString;

        public CustomerRepository(IConfiguration config, DataContext context)
        {
            _config = config;
            _context = context;
            connectionString = config.GetConnectionString("DefaultConnection")
                        ?? throw new InvalidOperationException("Connection string not configured.");
        }

        public async Task<LoginResponseDto?> Login(UserForLoginDto user)
        {
            CustomerDA ob = new CustomerDA(connectionString);
            return await ob.Login(user);
        }
        public async Task<EmailSetup?> GetEmailSetup()
        {
            CustomerDA ob = new CustomerDA(connectionString);
            return await ob.GetEmailList();
        }
        public async Task<bool> SendZipMail(List<IFormFile> files, string mailTo, string customerId, string supplierName)
        {
            UploadDA ob = new UploadDA(connectionString);
            if (files == null || files.Count == 0)
                return false;

            EmailSetup? emailSetup = await GetEmailSetup();
            if (emailSetup == null)
            {
                return false;
            }

            using (var memoryStream = new MemoryStream())
            {
                using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
                {
                    foreach (var file in files)
                    {
                        var entry = archive.CreateEntry(file.FileName);
                        using (var entryStream = entry.Open())
                        using (var fileStream = file.OpenReadStream())
                        {
                            await fileStream.CopyToAsync(entryStream);
                        }
                    }
                }

                memoryStream.Position = 0;

                try
                {
                    using (var mail = new MailMessage())
                    {
                        mail.From = new MailAddress(emailSetup.Username);
                        mail.To.Add(mailTo);
                        mail.Subject = "Invoices ZIP Folder";
                        mail.Body = "Please find attached invoices.";

                        var attachment = new Attachment(memoryStream, "Invoices.zip", "application/zip");
                        mail.Attachments.Add(attachment);

                        using (var smtp = new SmtpClient(emailSetup.SmtpServer))
                        {
                            smtp.Port = emailSetup.Port;
                            smtp.Credentials = new NetworkCredential(emailSetup.Username, emailSetup.Password);
                            smtp.EnableSsl = emailSetup.EnableSsl;

                            await smtp.SendMailAsync(mail);
                        }
                    }

                    foreach (var file in files)
                    {
                        await ob.InsertUploadRecordAsync(customerId, supplierName, file.FileName, "", "EMAIL");
                    }

                    return true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Email sending failed: " + ex.Message);
                    return false;
                }
            }
        }

        public async Task<List<string>> UploadInvoicesAsync(List<IFormFile> files)
        {
            var uploadedUrls = new List<string>();

            var connectionString = _config["AzureStorage:ConnectionString"];
            var containerName = _config["AzureStorage:ContainerName"];

            var blobServiceClient = new BlobServiceClient(connectionString);
            var containerClient = blobServiceClient.GetBlobContainerClient(containerName);

            await containerClient.CreateIfNotExistsAsync();

            string folderName = "invoice";

            foreach (var file in files)
            {
                if (file != null && file.Length > 0)
                {
                    string uniqueFileName = $"{Guid.NewGuid()}_{file.FileName}";
                    string blobPath = $"{folderName}/{uniqueFileName}";

                    var blobClient = containerClient.GetBlobClient(blobPath);

                    using (var stream = file.OpenReadStream())
                    {
                        await blobClient.UploadAsync(stream, overwrite: true);
                    }

                    uploadedUrls.Add(blobClient.Uri.ToString());
                }
            }

            return uploadedUrls;
        }
    }
}