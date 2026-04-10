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
        public async Task<EmailSetup?> GetEmailSetup()
        {
            CustomerDA ob = new CustomerDA(connectionString);
            return await ob.GetEmailList();
        }
        // public async Task<bool> SendZipMail(List<IFormFile> files, string mailTo, string customerId, string supplierName)
        // {
        //     UploadDA ob = new UploadDA(connectionString);
        //     if (files == null || files.Count == 0)
        //         return false;

        //     EmailSetup? emailSetup = await GetEmailSetup();
        //     if (emailSetup == null)
        //     {
        //         return false;
        //     }

        //     using (var memoryStream = new MemoryStream())
        //     {
        //         using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        //         {
        //             foreach (var file in files)
        //             {
        //                 var entry = archive.CreateEntry(file.FileName);
        //                 using (var entryStream = entry.Open())
        //                 using (var fileStream = file.OpenReadStream())
        //                 {
        //                     await fileStream.CopyToAsync(entryStream);
        //                 }
        //             }
        //         }

        //         memoryStream.Position = 0;

        //         try
        //         {
        //             using (var mail = new MailMessage())
        //             {
        //                 mail.From = new MailAddress(emailSetup.Username);
        //                 mail.To.Add(mailTo);
        //                 mail.Subject = "Invoices ZIP Folder";
        //                 mail.Body = "Please find attached invoices.";

        //                 var attachment = new Attachment(memoryStream, "Invoices.zip", "application/zip");
        //                 mail.Attachments.Add(attachment);

        //                 using (var smtp = new SmtpClient(emailSetup.SmtpServer))
        //                 {
        //                     smtp.Port = emailSetup.Port;
        //                     smtp.Credentials = new NetworkCredential(emailSetup.Username, emailSetup.Password);
        //                     smtp.EnableSsl = emailSetup.EnableSsl;

        //                     await smtp.SendMailAsync(mail);
        //                 }
        //             }

        //             // foreach (var file in files)
        //             // {
        //             //     await ob.InsertUploadRecordAsync(customerId, supplierName, file.FileName, "", "EMAIL");
        //             // }

        //             return true;
        //         }
        //         catch
        //         {
        //             return false;
        //         }
        //     }
        // }
        public async Task<bool> SendZipMail(List<IFormFile> files, string mailTo)
        {
            if (files == null || files.Count == 0)
                return false;

            EmailSetup? emailSetup = await GetEmailSetup();
            if (emailSetup == null)
                return false;

            var zipPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.zip");

            try
            {
                using (var zip = ZipFile.Open(zipPath, ZipArchiveMode.Create))
                {
                    foreach (var file in files)
                    {
                        var entry = zip.CreateEntry(file.FileName, CompressionLevel.Fastest);

                        using var entryStream = entry.Open();
                        using var fileStream = file.OpenReadStream();

                        await fileStream.CopyToAsync(entryStream);
                    }
                }
                using var mail = new MailMessage();
                mail.From = new MailAddress(emailSetup.Username);
                mail.To.Add(mailTo);
                mail.Subject = "Invoices ZIP Folder";
                mail.Body = "Please find attached invoices.";

                using (var zipStream = new FileStream(zipPath, FileMode.Open, FileAccess.Read))
                {
                    var attachment = new Attachment(zipStream, "Invoices.zip", "application/zip");
                    mail.Attachments.Add(attachment);

                    using var smtp = new SmtpClient(emailSetup.SmtpServer)
                    {
                        Port = emailSetup.Port,
                        Credentials = new NetworkCredential(emailSetup.Username, emailSetup.Password),
                        EnableSsl = emailSetup.EnableSsl
                    };

                    await smtp.SendMailAsync(mail);
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("EMAIL ERROR: " + ex.Message);
                return false;
            }
            finally
            {
                if (File.Exists(zipPath))
                {
                    File.Delete(zipPath);
                }
            }
        }

        public async Task<bool> SendEmail(string mailTo, string subject, string body)
        {
            EmailSetup? emailSetup = await GetEmailSetup();
            if (emailSetup == null)
            {
                return false;
            }

            try
            {
                using (var mail = new MailMessage())
                {
                    mail.From = new MailAddress(emailSetup.Username);
                    mail.To.Add(mailTo);
                    mail.Subject = subject;
                    mail.Body = body;
                    mail.IsBodyHtml = true;

                    using (var smtp = new SmtpClient(emailSetup.SmtpServer))
                    {
                        smtp.Port = emailSetup.Port;
                        smtp.Credentials = new NetworkCredential(emailSetup.Username, emailSetup.Password);
                        smtp.EnableSsl = emailSetup.EnableSsl;

                        await smtp.SendMailAsync(mail);
                    }
                }

                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}