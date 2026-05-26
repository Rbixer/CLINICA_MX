using Clinica.Core.Data;
using Clinica.Api.Infrastructure;
using Clinica.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/estudios")]
public class EstudiosController(ClinicaDbContext db, FileStorageService files) : ControllerBase
{
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var eid = ClinicaHelpers.ParseId(id);
        if (eid == null) return BadRequest(new { message = "ID inválido." });
        var e = await db.EstudiosClinicos.FindAsync(eid);
        if (e != null)
        {
            files.DeleteIfExists(e.Archivo);
            files.DeleteIfExists(e.FotoAntes);
            files.DeleteIfExists(e.FotoDespues);
            db.EstudiosClinicos.Remove(e);
            await db.SaveChangesAsync();
        }
        return Ok(new { ok = true });
    }
}
