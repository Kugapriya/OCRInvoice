using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using Microsoft.Graph;


public class OneDriveRepository
{
    private readonly TokenCredential _credential;
    private readonly HttpClient _http;
    private readonly string _baseFolderPath;
    private readonly string _userEmail;

    public OneDriveRepository(IConfiguration config)
    {
        var clientId = config["OneDrive:ClientId"]
            ?? throw new InvalidOperationException("OneDrive:ClientId must be configured.");

        var tenantId = config["OneDrive:TenantId"]
            ?? throw new InvalidOperationException("OneDrive:TenantId must be configured.");

        var clientSecret = config["OneDrive:ClientSecret"]
            ?? throw new InvalidOperationException("OneDrive:ClientSecret must be configured.");

        _baseFolderPath = config["OneDrive:UploadFolderPath"]
            ?? throw new InvalidOperationException("OneDrive:UploadFolderPath must be configured.");

        _userEmail = config["OneDrive:UserEmail"]
            ?? throw new InvalidOperationException("OneDrive:UserEmail must be configured.");

        _credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        _http = new HttpClient();
    }

    private async Task<string> GetAccessTokenAsync()
    {
        var token = await _credential.GetTokenAsync(
            new TokenRequestContext(new[] { "https://graph.microsoft.com/.default" }),
            CancellationToken.None);

        return token.Token;
    }

    private async Task<HttpRequestMessage> BuildRequestAsync(HttpMethod method, string url)
    {
        var req = new HttpRequestMessage(method, url);
        req.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", await GetAccessTokenAsync());

        return req;
    }

    private static string BuildDrivePath(string path)
    {
        var segments = path.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);

        for (var i = 0; i < segments.Length; i++)
            segments[i] = Uri.EscapeDataString(segments[i]);

        return string.Join("/", segments);
    }

    private async Task<DriveItem?> GetDriveItemByPathAsync(string path)
    {
        var encoded = BuildDrivePath(path);

        var url = $"https://graph.microsoft.com/v1.0/users/{_userEmail}/drive/root:/{encoded}";

        using var req = await BuildRequestAsync(HttpMethod.Get, url);
        using var resp = await _http.SendAsync(req);

        if (resp.StatusCode == HttpStatusCode.NotFound)
            return null;

        if (!resp.IsSuccessStatusCode)
        {
            var error = await resp.Content.ReadAsStringAsync();
            throw new Exception($"Graph Error: {resp.StatusCode} - {error}");
        }

        var json = await resp.Content.ReadAsStringAsync();

        return JsonSerializer.Deserialize<DriveItem>(json);
    }

    private async Task<DriveItem> CreateFolderAsync(string parentPath, string folderName)
    {
        var parentSegment = string.IsNullOrEmpty(parentPath)
            ? "root"
            : $"root:/{BuildDrivePath(parentPath)}:";

        var url = $"https://graph.microsoft.com/v1.0/users/{_userEmail}/drive/{parentSegment}/children";

        var body = new Dictionary<string, object?>
        {
            ["name"] = folderName,
            ["folder"] = new { },
            ["@microsoft.graph.conflictBehavior"] = "rename"
        };

        using var req = await BuildRequestAsync(HttpMethod.Post, url);

        req.Content = new StringContent(
            JsonSerializer.Serialize(body),
            Encoding.UTF8,
            "application/json");

        using var resp = await _http.SendAsync(req);

        if (!resp.IsSuccessStatusCode)
        {
            var error = await resp.Content.ReadAsStringAsync();
            throw new Exception($"Folder Create Error: {resp.StatusCode} - {error}");
        }

        var json = await resp.Content.ReadAsStringAsync();

        return JsonSerializer.Deserialize<DriveItem>(json)!;
    }

    private async Task<DriveItem> EnsureFolderExistsAsync(string parentFolderPath, string folderName)
    {
        string fullPath = string.IsNullOrEmpty(parentFolderPath)
            ? folderName
            : $"{parentFolderPath}/{folderName}";

        var existing = await GetDriveItemByPathAsync(fullPath);

        if (existing != null)
            return existing;

        return await CreateFolderAsync(parentFolderPath, folderName);
    }

    public async Task<List<DriveItem>> UploadFilesAsync(
        List<IFormFile> files,
        string customerId,
        string supplierName)
    {
        if (files == null || files.Count == 0)
            throw new Exception("No files to upload.");

        await EnsureFolderExistsAsync(_baseFolderPath, customerId);

        await EnsureFolderExistsAsync(
            $"{_baseFolderPath}/{customerId}",
            supplierName);

        var uploadedFiles = new List<DriveItem>();

        foreach (var file in files)
        {
            if (file.Length == 0)
                continue;

            using var stream = file.OpenReadStream();

            var uploadPath =
                $"{_baseFolderPath}/{customerId}/{supplierName}/{file.FileName}";

            var encoded = BuildDrivePath(uploadPath);

            var url =
                $"https://graph.microsoft.com/v1.0/users/{_userEmail}/drive/root:/{encoded}:/content";

            using var req = await BuildRequestAsync(HttpMethod.Put, url);

            req.Content = new StreamContent(stream);

            using var resp = await _http.SendAsync(req);

            if (!resp.IsSuccessStatusCode)
            {
                var error = await resp.Content.ReadAsStringAsync();
                throw new Exception($"Upload Error: {resp.StatusCode} - {error}");
            }

            var json = await resp.Content.ReadAsStringAsync();

            uploadedFiles.Add(JsonSerializer.Deserialize<DriveItem>(json)!);
        }

        return uploadedFiles;
    }
}