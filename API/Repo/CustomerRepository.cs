using System.IO.Compression;
using API.DataAccess;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using MimeKit;

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
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(emailSetup.Username, emailSetup.Username));
                message.To.Add(new MailboxAddress(mailTo, mailTo));
                message.Subject = "Invoices ZIP Folder";

                var builder = new BodyBuilder { TextBody = "Please find attached invoices." };
                builder.Attachments.Add("Invoices.zip", await File.ReadAllBytesAsync(zipPath));
                message.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                await smtp.ConnectAsync(emailSetup.SmtpServer, emailSetup.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(emailSetup.Username, emailSetup.Password);
                await smtp.SendAsync(message);
                await smtp.DisconnectAsync(true);

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
                Console.WriteLine("[EMAIL] No email config found in EmailSetups table");
                return false;
            }

            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(emailSetup.Username, emailSetup.Username));
                message.To.Add(new MailboxAddress(mailTo, mailTo));
                message.Subject = subject;
                message.Body = new TextPart("html") { Text = body };

                using var smtp = new SmtpClient();
                await smtp.ConnectAsync(emailSetup.SmtpServer, emailSetup.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(emailSetup.Username, emailSetup.Password);
                await smtp.SendAsync(message);
                await smtp.DisconnectAsync(true);

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL ERROR] {ex.Message}");
                return false;
            }
        }
    }
}