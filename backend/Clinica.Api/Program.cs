using Clinica.Api.Infrastructure;
using Clinica.Api.Services;
using Clinica.Core;
using Clinica.Core.Data;
using Clinica.Core.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
        o.JsonSerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=(localdb)\\mssqllocaldb;Database=ClinicaIntegral;Trusted_Connection=True;TrustServerCertificate=True";

builder.Services.AddClinicaDatabase(connectionString);

builder.Services.AddSingleton<FileStorageService>();

var app = builder.Build();

var files = app.Services.GetRequiredService<FileStorageService>();
files.EnsureUploadRoot();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
    await ClinicaSeedService.SeedAsync(db);
    try
    {
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('citas', 'PacienteId') IS NOT NULL ALTER TABLE citas ALTER COLUMN PacienteId INT NULL");
    }
    catch { /* columna ya nullable o tabla distinta */ }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(files.UploadRoot),
    RequestPath = "/uploads"
});

app.MapControllers();

var port = builder.Configuration.GetValue("Clinica:Puerto", 4100);
app.Urls.Add($"http://127.0.0.1:{port}");

app.Run();
