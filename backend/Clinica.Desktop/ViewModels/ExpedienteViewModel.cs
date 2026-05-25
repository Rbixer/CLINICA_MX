using Clinica.Core.Data;
using Clinica.Desktop.Services;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.ObjectModel;

namespace Clinica.Desktop.ViewModels;

public partial class ExpedienteViewModel(IServiceProvider services, DocumentStorageService docs) : ViewModelBase, ILoadableViewModel
{
    public ObservableCollection<PacienteOption> Pacientes { get; } = [];
    [ObservableProperty] private PacienteOption? _pacienteSeleccionado;
    public ObservableCollection<ConsultaRow> Consultas { get; } = [];
    public ObservableCollection<DocumentoRow> Documentos { get; } = [];
    [ObservableProperty] private ConsultaRow? _consultaSeleccionada;
    [ObservableProperty] private DocumentoRow? _documentoSeleccionado;
    [ObservableProperty] private string? _mensaje;

    public async Task LoadAsync()
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
        var list = await db.Pacientes.OrderBy(p => p.Nombre).Select(p => new PacienteOption(p.Id, p.Nombre, p.Dpi)).ToListAsync();
        Pacientes.Clear();
        foreach (var p in list) Pacientes.Add(p);
        if (PacienteSeleccionado == null && Pacientes.Count > 0)
            PacienteSeleccionado = Pacientes[0];
        else if (PacienteSeleccionado != null)
            await CargarExpedienteAsync();
    }

    partial void OnPacienteSeleccionadoChanged(PacienteOption? value) =>
        _ = CargarExpedienteAsync();

    private async Task CargarExpedienteAsync()
    {
        Consultas.Clear();
        Documentos.Clear();
        if (PacienteSeleccionado == null) return;

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
        var id = PacienteSeleccionado.Id;

        var consultas = await db.Consultas
            .Include(c => c.Medico)
            .Where(c => c.PacienteId == id)
            .OrderByDescending(c => c.Fecha)
            .ToListAsync();
        foreach (var c in consultas)
            Consultas.Add(new ConsultaRow(c.Id, c.Fecha, c.Motivo ?? "", c.Diagnostico ?? "", c.Medico?.Nombre ?? "—"));

        var estudios = await db.EstudiosClinicos.Where(e => e.PacienteId == id).OrderByDescending(e => e.FechaEstudio).ToListAsync();
        foreach (var e in estudios)
            Documentos.Add(new DocumentoRow(e.Id, "Estudio", e.Titulo, e.FechaEstudio ?? "", e.Archivo));

        var recetas = await db.Recetas.Where(r => r.PacienteId == id).OrderByDescending(r => r.Fecha).ToListAsync();
        foreach (var r in recetas)
            Documentos.Add(new DocumentoRow(r.Id, "Receta", r.Medicamentos.Length > 60 ? r.Medicamentos[..60] + "…" : r.Medicamentos, r.Fecha, null));

        var lab = await db.OrdenesLaboratorio.Where(o => o.PacienteId == id).OrderByDescending(o => o.Fecha).ToListAsync();
        foreach (var o in lab)
            Documentos.Add(new DocumentoRow(o.Id, "Laboratorio", o.EstudiosSolicitados.Length > 60 ? o.EstudiosSolicitados[..60] + "…" : o.EstudiosSolicitados, o.Fecha, null));

        Mensaje = $"{Consultas.Count} consulta(s), {Documentos.Count} documento(s)";
    }

    [RelayCommand]
    private void AbrirDocumento()
    {
        if (DocumentoSeleccionado?.Archivo == null) return;
        try
        {
            docs.OpenDocument(DocumentoSeleccionado.Archivo);
        }
        catch (Exception ex)
        {
            Mensaje = ex.Message;
        }
    }
}

public record PacienteOption(int Id, string Nombre, string Dpi)
{
    public string Etiqueta => $"{Nombre} ({Dpi})";
}

public record ConsultaRow(int Id, string Fecha, string Motivo, string Diagnostico, string Medico);
public record DocumentoRow(int Id, string Tipo, string Titulo, string Fecha, string? Archivo);
