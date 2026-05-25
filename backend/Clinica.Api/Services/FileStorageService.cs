namespace Clinica.Api.Services;

public class FileStorageService(IWebHostEnvironment env, IConfiguration config)
{
    private static readonly HashSet<string> AllowedMime = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "application/pdf"
    };

    private static readonly Dictionary<string, string> ExtByMime = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/jpg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif",
        ["application/pdf"] = ".pdf"
    };

    public string UploadRoot
    {
        get
        {
            var sub = config["Clinica:UploadPath"] ?? "uploads";
            var dataRoot = config["Clinica:DataRoot"];
            if (!string.IsNullOrWhiteSpace(dataRoot))
            {
                dataRoot = Environment.ExpandEnvironmentVariables(dataRoot);
                return Path.GetFullPath(Path.Combine(dataRoot, sub));
            }
            return Path.GetFullPath(Path.Combine(env.ContentRootPath, sub));
        }
    }

    public void EnsureUploadRoot()
    {
        Directory.CreateDirectory(UploadRoot);
    }

    public string PublicUrl(string relative) => $"/uploads/{relative.Replace('\\', '/')}";

    public SavedFile SaveBase64(string subdir, string dataBase64, string? mimeType, string? nombreArchivo, int maxMb = 12)
    {
        var mime = (mimeType ?? "image/jpeg").ToLowerInvariant();
        if (!AllowedMime.Contains(mime))
            throw new InvalidOperationException("Formato no permitido. Use JPG, PNG, WEBP, GIF o PDF.");

        var raw = dataBase64.Contains(',') ? dataBase64.Split(',')[1] : dataBase64;
        var buffer = Convert.FromBase64String(raw);
        if (buffer.Length == 0) throw new InvalidOperationException("Archivo vacío o inválido.");
        if (buffer.Length > maxMb * 1024 * 1024)
            throw new InvalidOperationException($"El archivo supera {maxMb} MB.");

        var ext = ExtByMime.GetValueOrDefault(mime) ?? Path.GetExtension(nombreArchivo ?? "") ?? ".bin";
        var name = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}"[..20] + ext;
        var dir = Path.Combine(UploadRoot, subdir);
        Directory.CreateDirectory(dir);
        var fullPath = Path.Combine(dir, name);
        File.WriteAllBytes(fullPath, buffer);
        var relative = Path.Combine(subdir, name).Replace('\\', '/');
        return new SavedFile(relative, mime, buffer.Length, nombreArchivo ?? name);
    }

    public void DeleteIfExists(string? relative)
    {
        if (string.IsNullOrWhiteSpace(relative)) return;
        var full = Path.Combine(UploadRoot, relative);
        if (File.Exists(full)) File.Delete(full);
    }

    public record SavedFile(string Relative, string Mime, long Size, string Name);
}
