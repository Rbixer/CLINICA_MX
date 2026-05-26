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
    try
    {
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoSeguimiento') IS NULL ALTER TABLE consultas ADD FotoSeguimiento NVARCHAR(500) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoSeguimientoNombreOriginal') IS NULL ALTER TABLE consultas ADD FotoSeguimientoNombreOriginal NVARCHAR(300) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoSeguimientoMimeType') IS NULL ALTER TABLE consultas ADD FotoSeguimientoMimeType NVARCHAR(80) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoSeguimientoTamano') IS NULL ALTER TABLE consultas ADD FotoSeguimientoTamano BIGINT NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoAntes') IS NULL ALTER TABLE consultas ADD FotoAntes NVARCHAR(500) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoAntesNombreOriginal') IS NULL ALTER TABLE consultas ADD FotoAntesNombreOriginal NVARCHAR(300) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoAntesMimeType') IS NULL ALTER TABLE consultas ADD FotoAntesMimeType NVARCHAR(80) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoAntesTamano') IS NULL ALTER TABLE consultas ADD FotoAntesTamano BIGINT NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoDespues') IS NULL ALTER TABLE consultas ADD FotoDespues NVARCHAR(500) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoDespuesNombreOriginal') IS NULL ALTER TABLE consultas ADD FotoDespuesNombreOriginal NVARCHAR(300) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoDespuesMimeType') IS NULL ALTER TABLE consultas ADD FotoDespuesMimeType NVARCHAR(80) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('consultas', 'FotoDespuesTamano') IS NULL ALTER TABLE consultas ADD FotoDespuesTamano BIGINT NULL");
    }
    catch { /* columnas de seguimiento no disponibles en proveedores no SQL Server */ }
    try
    {
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('estudios_clinicos', 'CitaId') IS NULL ALTER TABLE estudios_clinicos ADD CitaId INT NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('estudios_clinicos', 'FotoAntes') IS NULL ALTER TABLE estudios_clinicos ADD FotoAntes NVARCHAR(500) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('estudios_clinicos', 'FotoAntesNombreOriginal') IS NULL ALTER TABLE estudios_clinicos ADD FotoAntesNombreOriginal NVARCHAR(300) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('estudios_clinicos', 'FotoAntesMimeType') IS NULL ALTER TABLE estudios_clinicos ADD FotoAntesMimeType NVARCHAR(80) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('estudios_clinicos', 'FotoAntesTamano') IS NULL ALTER TABLE estudios_clinicos ADD FotoAntesTamano BIGINT NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('estudios_clinicos', 'FotoDespues') IS NULL ALTER TABLE estudios_clinicos ADD FotoDespues NVARCHAR(500) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('estudios_clinicos', 'FotoDespuesNombreOriginal') IS NULL ALTER TABLE estudios_clinicos ADD FotoDespuesNombreOriginal NVARCHAR(300) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('estudios_clinicos', 'FotoDespuesMimeType') IS NULL ALTER TABLE estudios_clinicos ADD FotoDespuesMimeType NVARCHAR(80) NULL");
        await db.Database.ExecuteSqlRawAsync(
            "IF COL_LENGTH('estudios_clinicos', 'FotoDespuesTamano') IS NULL ALTER TABLE estudios_clinicos ADD FotoDespuesTamano BIGINT NULL");
    }
    catch { /* columnas de evolución de estudios no disponibles en proveedores no SQL Server */ }
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
