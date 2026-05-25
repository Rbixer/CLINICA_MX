using Microsoft.Extensions.Configuration;

namespace Clinica.Desktop.Services;

public class DocumentStorageService(IConfiguration config)
{
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
            return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, sub));
        }
    }

    public string ResolvePath(string relative) => Path.Combine(UploadRoot, relative);

    public void OpenDocument(string relative)
    {
        var full = ResolvePath(relative);
        if (!File.Exists(full)) throw new FileNotFoundException("Documento no encontrado", full);
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(full) { UseShellExecute = true });
    }
}
