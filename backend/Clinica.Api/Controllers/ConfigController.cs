using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/config")]
public class ConfigController(ClinicaDbContext db, FileStorageService files) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var cfg = await db.ClinicaConfig.FindAsync(1);
        if (cfg == null)
        {
            cfg = new ClinicaConfig { Id = 1, Nombre = "Clínica Integral" };
            db.ClinicaConfig.Add(cfg);
            await db.SaveChangesAsync();
        }
        return Ok(new
        {
            id = cfg.Id,
            nombre = cfg.Nombre,
            direccion = cfg.Direccion,
            telefono = cfg.Telefono,
            email = cfg.Email,
            logo_path = cfg.LogoPath,
            logo_url = cfg.LogoPath != null ? files.PublicUrl(cfg.LogoPath) : null
        });
    }

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] ConfigRequest body)
    {
        var cfg = await db.ClinicaConfig.FindAsync(1);
        if (cfg == null)
        {
            cfg = new ClinicaConfig { Id = 1 };
            db.ClinicaConfig.Add(cfg);
        }
        cfg.Nombre = string.IsNullOrWhiteSpace(body.Nombre) ? "Clínica Integral" : body.Nombre.Trim();
        cfg.Direccion = body.Direccion?.Trim();
        cfg.Telefono = body.Telefono?.Trim();
        cfg.Email = body.Email?.Trim();
        await db.SaveChangesAsync();
        return Ok(new
        {
            id = cfg.Id,
            nombre = cfg.Nombre,
            direccion = cfg.Direccion,
            telefono = cfg.Telefono,
            email = cfg.Email,
            logo_path = cfg.LogoPath
        });
    }

    public class ConfigRequest
    {
        public string? Nombre { get; set; }
        public string? Direccion { get; set; }
        public string? Telefono { get; set; }
        public string? Email { get; set; }
    }
}
