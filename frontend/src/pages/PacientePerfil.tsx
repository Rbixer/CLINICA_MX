import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Camera, Download, FileText, FileUp, Image as ImageIcon, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { api } from "../api";
import type { ClinicaConfig, Consulta, EstadoTratamiento, PacientePerfil as Perfil, Tratamiento } from "../types";
import { Button, Card, Input, Label, Modal, Select } from "../components/ui";
import { estadoCitaClass, estadoCitaLabel, fechaHoyInput, formatFecha, formatFechaHora, formatMoneda } from "../utils/format";
import { fileToBase64 } from "../utils/files";
import FichaClinica from "../components/FichaClinica";
import { descargarFichaClinicaPdf } from "../utils/pdf/fichaClinicaPdf";
import { descargarCitaPacientePdf, descargarCitasPacientePdf, descargarOrdenLabPdf, descargarRecetaPdf } from "../utils/pdf/clinicaPdf";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "historia", label: "Historia clínica" },
  { id: "tratamientos", label: "Tratamientos" },
  { id: "estudios", label: "Estudios" },
  { id: "recetas", label: "Recetas" },
  { id: "laboratorio", label: "Laboratorio" },
  { id: "pagos", label: "Pagos" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PacientePerfilPage() {
  const { id } = useParams();
  const pacienteId = Number(id);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cfg, setCfg] = useState<ClinicaConfig | null>(null);
  const [medicos, setMedicos] = useState<{ id: number; nombre: string }[]>([]);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<TabId>("resumen");
  const [modal, setModal] = useState<string | null>(null);
  const [consultaEdit, setConsultaEdit] = useState<Consulta | null>(null);
  const [tratamientoEdit, setTratamientoEdit] = useState<Tratamiento | null>(null);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TABS.some((x) => x.id === t)) setTab(t as TabId);
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!pacienteId) return;
    const [p, c, m] = await Promise.all([
      api.pacientes.perfil(pacienteId),
      api.config.get(),
      api.medicos.list()
    ]);
    setPerfil(p);
    setCfg(c);
    setMedicos(m);
  }, [pacienteId]);

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, [load]);

  async function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !perfil) return;
    try {
      const dataBase64 = await fileToBase64(file);
      await api.pacientes.uploadFoto(perfil.id, {
        dataBase64,
        mimeType: file.type,
        nombreArchivo: file.name
      });
      toast.success("Fotografía actualizada");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  if (!perfil) {
    return <p className="text-slate-500">Cargando expediente…</p>;
  }

  return (
    <div>
      <Link to="/pacientes" className="mb-4 inline-flex items-center gap-2 text-sm text-primary-600 hover:underline print:hidden">
        <ArrowLeft className="h-4 w-4" /> Volver a pacientes
      </Link>

      <Card className="mb-6 flex flex-wrap items-start gap-6 print:hidden">
        <div className="relative">
          {perfil.foto_url ? (
            <img src={perfil.foto_url} alt="" className="h-24 w-24 rounded-xl object-cover ring-2 ring-slate-100" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-primary-100 text-2xl font-bold text-primary-700">
              {perfil.nombre.charAt(0)}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary-600 p-1.5 text-white shadow">
            <FileUp className="h-3.5 w-3.5" />
            <input type="file" accept="image/*" className="hidden" onChange={onFoto} />
          </label>
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-2xl font-bold text-slate-900">{perfil.nombre}</h1>
          <p className="text-sm text-slate-500">DPI {perfil.dpi} · {perfil.telefono}</p>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100">
            <FileUp className="h-4 w-4" /> Cambiar fotografía del paciente
            <input type="file" accept="image/*" className="hidden" onChange={onFoto} />
          </label>
          {perfil.alergias ? (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1 text-sm text-rose-700">Alergias: {perfil.alergias}</p>
          ) : null}
        </div>
        {cfg ? (
          <Button
            variant="secondary"
            onClick={() =>
              descargarFichaClinicaPdf({
                cfg,
                paciente: { ...perfil, id: perfil.id } as unknown as Record<string, string | null | undefined> & {
                  id: number;
                },
                consultas: perfil.consultas,
                estudios: perfil.estudios
              })
            }
          >
            <Download className="h-4 w-4" /> Ficha clínica PDF
          </Button>
        ) : null}
      </Card>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && <ResumenTab perfil={perfil} cfg={cfg} />}
      {tab === "historia" && (
        <HistoriaTab
          perfil={perfil}
          cfg={cfg}
          medicos={medicos}
          onRefresh={load}
          onOpen={() => {
            setConsultaEdit(null);
            setModal("consulta");
          }}
          onEditConsulta={(c) => {
            setConsultaEdit(c);
            setModal("consulta");
          }}
        />
      )}
      {tab === "tratamientos" && (
        <TratamientosTab
          perfil={perfil}
          medicos={medicos}
          onRefresh={load}
          onOpen={() => {
            setTratamientoEdit(null);
            setModal("tratamiento");
          }}
          onEditTratamiento={(t) => {
            setTratamientoEdit(t);
            setModal("tratamiento");
          }}
        />
      )}
      {tab === "estudios" && <EstudiosTab perfil={perfil} onRefresh={load} />}
      {tab === "recetas" && (
        <RecetasTab perfil={perfil} cfg={cfg} medicos={medicos} onRefresh={load} onOpen={() => setModal("receta")} />
      )}
      {tab === "laboratorio" && (
        <LabTab perfil={perfil} cfg={cfg} medicos={medicos} onRefresh={load} onOpen={() => setModal("lab")} />
      )}
      {tab === "pagos" && <PagosTab perfil={perfil} onRefresh={load} onOpen={() => setModal("pago")} />}

      {modal === "consulta" && (
        <ConsultaModal
          pacienteId={perfil.id}
          medicos={medicos}
          consulta={consultaEdit}
          onClose={() => {
            setModal(null);
            setConsultaEdit(null);
          }}
          onSaved={load}
        />
      )}
      {modal === "tratamiento" && (
        <TratamientoModal
          pacienteId={perfil.id}
          medicos={medicos}
          tratamiento={tratamientoEdit}
          onClose={() => {
            setModal(null);
            setTratamientoEdit(null);
          }}
          onSaved={load}
        />
      )}
      {modal === "receta" && (
        <RecetaModal pacienteId={perfil.id} medicos={medicos} onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal === "lab" && (
        <LabModal pacienteId={perfil.id} medicos={medicos} onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal === "pago" && <PagoModal pacienteId={perfil.id} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}

function ResumenTab({ perfil, cfg }: { perfil: Perfil; cfg: ClinicaConfig | null }) {
  const tratamientosActivos = perfil.tratamientos.filter((t) => t.estado === "activo").length;
  const proximasCitas = perfil.citas.filter((c) => c.estado !== "cancelada" && new Date(c.fecha_hora) >= new Date()).length;

  async function descargarTodasLasCitas() {
    if (!cfg) return;
    try {
      await descargarCitasPacientePdf({
        cfg,
        paciente: perfil as unknown as Record<string, string | number | null | undefined> & { id: number; foto_url?: string | null },
        citas: perfil.citas
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el PDF");
    }
  }

  async function descargarUnaCita(citaId: number) {
    if (!cfg) return;
    const cita = perfil.citas.find((c) => c.id === citaId);
    if (!cita) return;
    try {
      await descargarCitaPacientePdf({
        cfg,
        paciente: perfil as unknown as Record<string, string | number | null | undefined> & { id: number; foto_url?: string | null },
        cita
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el PDF");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Citas registradas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{perfil.citas.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Próximas citas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{proximasCitas}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tratamientos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{perfil.tratamientos.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tratamientos activos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{tratamientosActivos}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Historial completo de citas</h3>
              <p className="text-sm text-slate-500">Todas las citas agendadas para este paciente.</p>
            </div>
            {cfg ? (
              <Button variant="secondary" onClick={descargarTodasLasCitas}>
                <Download className="h-4 w-4" /> PDF completo
              </Button>
            ) : null}
          </div>
          {perfil.citas.length === 0 ? (
            <p className="text-sm text-slate-500">No hay citas registradas.</p>
          ) : (
            <div className="space-y-3">
              {perfil.citas.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{formatFechaHora(c.fecha_hora)}</p>
                      <p className="text-sm text-slate-600">{c.motivo || "Sin motivo especificado"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoCitaClass(c.estado)}`}>
                        {estadoCitaLabel(c.estado)}
                      </span>
                      {cfg ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                          onClick={() => descargarUnaCita(c.id)}
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {c.medico_nombre ? <span>Médico: {c.medico_nombre}</span> : <span>Sin médico asignado</span>}
                    {c.notas ? <p className="mt-1 whitespace-pre-wrap text-slate-600">{c.notas}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Historial completo de tratamientos</h3>
            <p className="text-sm text-slate-500">Tratamientos activos, completados o suspendidos.</p>
          </div>
          {perfil.tratamientos.length === 0 ? (
            <p className="text-sm text-slate-500">No hay tratamientos registrados.</p>
          ) : (
            <div className="space-y-3">
              {perfil.tratamientos.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{t.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {formatFecha(t.fecha_inicio)}
                        {t.fecha_fin ? ` - ${formatFecha(t.fecha_fin)}` : ""}
                        {t.medico_nombre ? ` · ${t.medico_nombre}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tratamientoEstadoClass(t.estado)}`}>
                      {tratamientoEstadoLabel(t.estado)}
                    </span>
                  </div>
                  {t.descripcion ? <p className="mt-2 text-sm text-slate-600">{t.descripcion}</p> : null}
                  {t.progreso_notas ? <p className="mt-1 whitespace-pre-wrap text-sm italic text-slate-500">{t.progreso_notas}</p> : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function tratamientoEstadoLabel(estado: EstadoTratamiento) {
  if (estado === "activo") return "Activo";
  if (estado === "completado") return "Completado";
  return "Suspendido";
}

function tratamientoEstadoClass(estado: EstadoTratamiento) {
  if (estado === "activo") return "bg-emerald-50 text-emerald-700";
  if (estado === "completado") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

function HistoriaTab({
  perfil,
  cfg,
  onRefresh,
  onOpen,
  onEditConsulta
}: {
  perfil: Perfil;
  cfg: ClinicaConfig | null;
  medicos: { id: number; nombre: string }[];
  onRefresh: () => void;
  onOpen: () => void;
  onEditConsulta: (c: Consulta) => void;
}) {
  const fotosSeguimiento = perfil.consultas
    .filter((c) => c.foto_antes_url || c.foto_despues_url || c.foto_seguimiento_url)
    .slice()
    .reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <FileText className="h-4 w-4 text-primary-600" />
          <span>Ficha clínica formal del expediente</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {cfg ? (
            <Button
              variant="secondary"
              onClick={() =>
                descargarFichaClinicaPdf({
                  cfg,
                  paciente: { ...perfil, id: perfil.id } as unknown as Record<string, string | null | undefined> & {
                    id: number;
                  },
                  consultas: perfil.consultas,
                  estudios: perfil.estudios
                })
              }
            >
              <Download className="h-4 w-4" /> Descargar PDF
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir ficha
          </Button>
          <Button onClick={onOpen}>
            <Plus className="h-4 w-4" /> Nueva atención clínica
          </Button>
        </div>
      </div>

      <FichaClinica cfg={cfg} paciente={perfil} consultas={perfil.consultas} estudios={perfil.estudios} />

      <Card className="print:hidden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <ImageIcon className="h-4 w-4 text-primary-600" /> Evolución fotográfica
            </h3>
            <p className="text-sm text-slate-500">Fotos de antes y después por cada atención clínica.</p>
          </div>
        </div>
        {fotosSeguimiento.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay fotos de seguimiento. Puede agregarlas al crear o editar una atención clínica.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {fotosSeguimiento.map((c, index) => {
              return (
                <div
                  key={c.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary-700">
                      Atención clínica {fotosSeguimiento.length - index}
                    </p>
                    <p className="text-sm font-medium text-slate-900">{formatFecha(c.fecha)}</p>
                    <p className="truncate text-xs text-slate-500">{c.motivo || "Atención clínica"}</p>
                  </div>
                  <div className="grid gap-2 p-3 pt-0 sm:grid-cols-2">
                    <FotoEvolucionLink label="Antes" url={c.foto_antes_url} fecha={c.fecha} />
                    <FotoEvolucionLink label="Después" url={c.foto_despues_url} fecha={c.fecha} />
                    {!c.foto_antes_url && !c.foto_despues_url ? (
                      <FotoEvolucionLink label="Seguimiento" url={c.foto_seguimiento_url} fecha={c.fecha} />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="print:hidden">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Acciones por registro</h3>
        {perfil.consultas.length === 0 ? (
          <p className="text-sm text-slate-500">Use «Nueva atención clínica» para el primer registro.</p>
        ) : (
          <div className="space-y-2">
            {perfil.consultas.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span>
                  {formatFecha(c.fecha)} — {c.motivo || "Atención general"}
                  {c.medico_nombre ? ` · ${c.medico_nombre}` : ""}
                  {c.foto_antes_url || c.foto_despues_url || c.foto_seguimiento_url ? " · Con fotos" : ""}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    title="Editar"
                    onClick={() => onEditConsulta(c)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-rose-600 hover:bg-rose-50"
                    title="Eliminar"
                    onClick={async () => {
                      if (!confirm("¿Eliminar este registro?")) return;
                      await api.consultas.remove(c.id);
                      toast.success("Eliminado");
                      onRefresh();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function FotoEvolucionLink({ label, url, fecha }: { label: string; url?: string | null; fecha: string }) {
  if (!url) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
        Sin foto {label.toLowerCase()}
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-lg border border-slate-200">
      <img
        src={url}
        alt={`Foto ${label.toLowerCase()} ${formatFecha(fecha)}`}
        className="h-36 w-full object-cover transition group-hover:scale-[1.02]"
      />
      <span className="block bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
    </a>
  );
}

function FotoEvolucionInput({
  label,
  preview,
  fileName,
  onChange,
  onRemove
}: {
  label: string;
  preview: string | null;
  fileName?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50">
            <Camera className="h-3.5 w-3.5" /> Seleccionar
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={onChange} />
        </label>
      </div>
      {preview ? (
        <div className="mt-3">
          <img src={preview} alt={label} className="h-40 w-full rounded-lg object-cover ring-1 ring-slate-200" />
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate">{fileName || "Foto registrada"}</span>
            <button type="button" className="shrink-0 text-rose-600 hover:underline" onClick={onRemove}>
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
          Sin imagen
        </div>
      )}
    </div>
  );
}

function TratamientosTab({
  perfil,
  onRefresh,
  onOpen,
  onEditTratamiento
}: {
  perfil: Perfil;
  medicos: { id: number; nombre: string }[];
  onRefresh: () => void;
  onOpen: () => void;
  onEditTratamiento: (t: Tratamiento) => void;
}) {
  return (
    <Card>
      <div className="mb-4 flex justify-between">
        <h3 className="font-semibold">Seguimiento de tratamientos</h3>
        <Button onClick={onOpen}>
          <Plus className="h-4 w-4" /> Nuevo tratamiento
        </Button>
      </div>
      {perfil.tratamientos.length === 0 ? (
        <p className="text-sm text-slate-500">No hay tratamientos registrados.</p>
      ) : (
        <div className="space-y-3">
          {perfil.tratamientos.map((t) => (
            <div key={t.id} className="rounded-lg border p-4">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{t.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {formatFecha(t.fecha_inicio)}
                    {t.fecha_fin ? ` → ${formatFecha(t.fecha_fin)}` : ""}
                    {t.medico_nombre ? ` · ${t.medico_nombre}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.estado === "activo"
                      ? "bg-emerald-50 text-emerald-700"
                      : t.estado === "completado"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {t.estado}
                </span>
              </div>
              {t.descripcion ? <p className="mt-2 text-sm text-slate-600">{t.descripcion}</p> : null}
              {t.progreso_notas ? <p className="mt-1 text-sm italic text-slate-500">{t.progreso_notas}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ghost" className="!text-xs" onClick={() => onEditTratamiento(t)}>
                  <Pencil className="h-3 w-3" /> Editar / notas
                </Button>
                {t.estado === "activo" ? (
                  <>
                    <Button
                      variant="ghost"
                      className="!text-xs"
                      onClick={async () => {
                        await api.tratamientos.update(t.id, { estado: "completado", fechaFin: fechaHoyInput() });
                        toast.success("Tratamiento completado");
                        onRefresh();
                      }}
                    >
                      Completado
                    </Button>
                    <Button
                      variant="ghost"
                      className="!text-xs text-amber-700"
                      onClick={async () => {
                        await api.tratamientos.update(t.id, { estado: "suspendido" });
                        toast.success("Tratamiento suspendido");
                        onRefresh();
                      }}
                    >
                      Suspender
                    </Button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:underline"
                  onClick={async () => {
                    if (!confirm("¿Eliminar este tratamiento?")) return;
                    await api.tratamientos.remove(t.id);
                    toast.success("Eliminado");
                    onRefresh();
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function EstudiosTab({ perfil, onRefresh }: { perfil: Perfil; onRefresh: () => void }) {
  const nuevoParMultimedia = () => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    fotoAntes: null as File | null,
    fotoAntesPreview: null as string | null,
    fotoDespues: null as File | null,
    fotoDespuesPreview: null as string | null
  });
  const [tituloEstudio, setTituloEstudio] = useState("");
  const [citaEstudioId, setCitaEstudioId] = useState("");
  const [paresMultimedia, setParesMultimedia] = useState(() => [nuevoParMultimedia()]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const titulo = tituloEstudio.trim() || file.name;
    try {
      const dataBase64 = await fileToBase64(file);
      await api.estudios.upload(perfil.id, {
        titulo,
        dataBase64,
        mimeType: file.type,
        nombreArchivo: file.name,
        fechaEstudio: fechaHoyInput(),
        citaId: citaEstudioId ? Number(citaEstudioId) : null
      });
      toast.success("Estudio cargado");
      setTituloEstudio("");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function seleccionarFotoEvolucion(parId: string, tipo: "antes" | "despues", file?: File) {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      toast.error("Seleccione una imagen para la evolución.");
      return;
    }
    try {
      const preview = await fileToBase64(file);
      setParesMultimedia((actual) =>
        actual.map((par) =>
          par.id === parId
            ? tipo === "antes"
              ? { ...par, fotoAntes: file, fotoAntesPreview: preview }
              : { ...par, fotoDespues: file, fotoDespuesPreview: preview }
            : par
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la imagen");
    }
  }

  function quitarFotoEvolucion(parId: string, tipo: "antes" | "despues") {
    setParesMultimedia((actual) =>
      actual.map((par) =>
        par.id === parId
          ? tipo === "antes"
            ? { ...par, fotoAntes: null, fotoAntesPreview: null }
            : { ...par, fotoDespues: null, fotoDespuesPreview: null }
          : par
      )
    );
  }

  function agregarParMultimedia() {
    setParesMultimedia((actual) => [...actual, nuevoParMultimedia()]);
  }

  function eliminarParMultimedia(parId: string) {
    setParesMultimedia((actual) => (actual.length === 1 ? actual : actual.filter((par) => par.id !== parId)));
  }

  async function guardarEvolucion() {
    const paresConImagen = paresMultimedia.filter((par) => par.fotoAntes || par.fotoDespues);
    if (!paresConImagen.length) {
      toast.error("Seleccione al menos una fotografía.");
      return;
    }
    try {
      const tituloBase = tituloEstudio.trim() || "Evolución de recuperación";
      await Promise.all(
        paresConImagen.map(async (par, index) => {
          const [fotoAntesDataBase64, fotoDespuesDataBase64] = await Promise.all([
            par.fotoAntes ? fileToBase64(par.fotoAntes) : Promise.resolve(null),
            par.fotoDespues ? fileToBase64(par.fotoDespues) : Promise.resolve(null)
          ]);
          return api.estudios.upload(perfil.id, {
            titulo: paresConImagen.length > 1 ? `${tituloBase} ${index + 1}` : tituloBase,
            descripcion: "Fotografías de antes y después de la recuperación.",
            fechaEstudio: fechaHoyInput(),
            citaId: citaEstudioId ? Number(citaEstudioId) : null,
            fotoAntesDataBase64,
            fotoAntesMimeType: par.fotoAntes?.type,
            fotoAntesNombreArchivo: par.fotoAntes?.name,
            fotoDespuesDataBase64,
            fotoDespuesMimeType: par.fotoDespues?.type,
            fotoDespuesNombreArchivo: par.fotoDespues?.name
          });
        })
      );
      toast.success("Evolución fotográfica cargada");
      setTituloEstudio("");
      setCitaEstudioId("");
      setParesMultimedia([nuevoParMultimedia()]);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-semibold">Estudios clínicos (PDF e imágenes)</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label>Título del estudio</Label>
            <Input
              className="min-w-[12rem]"
              placeholder="Ej. Radiografía tórax"
              value={tituloEstudio}
              onChange={(e) => setTituloEstudio(e.target.value)}
            />
          </div>
          <div>
            <Label>Cita relacionada</Label>
            <Select
              value={citaEstudioId}
              onChange={(e) => setCitaEstudioId(e.target.value)}
              className="min-w-[14rem]"
            >
              <option value="">Sin cita específica</option>
              {perfil.citas.map((cita) => (
                <option key={cita.id} value={cita.id}>
                  {formatFechaHora(cita.fecha_hora)} · {cita.motivo || "Consulta"}
                </option>
              ))}
            </Select>
          </div>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">
            <FileUp className="h-4 w-4" /> Subir archivo
          </span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={onUpload} />
        </label>
        </div>
      </div>
      <div className="mb-4 rounded-xl border border-primary-100 bg-primary-50/40 p-3">
        <div className="mb-3">
          <h4 className="font-semibold text-slate-900">Evolución de recuperación</h4>
          <p className="text-sm text-slate-500">
            Suba fotografías de antes y después para documentar la recuperación del paciente.
          </p>
        </div>
        <div className="space-y-3">
          {paresMultimedia.map((par, index) => (
            <div key={par.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">Multimedia {index + 1}</p>
                {paresMultimedia.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-rose-600 hover:underline"
                    onClick={() => eliminarParMultimedia(par.id)}
                  >
                    Quitar bloque
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <EstudioFotoInput
                  label="Foto antes"
                  preview={par.fotoAntesPreview}
                  fileName={par.fotoAntes?.name}
                  onSelect={(file) => seleccionarFotoEvolucion(par.id, "antes", file)}
                  onRemove={() => quitarFotoEvolucion(par.id, "antes")}
                />
                <EstudioFotoInput
                  label="Foto después"
                  preview={par.fotoDespuesPreview}
                  fileName={par.fotoDespues?.name}
                  onSelect={(file) => seleccionarFotoEvolucion(par.id, "despues", file)}
                  onRemove={() => quitarFotoEvolucion(par.id, "despues")}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={agregarParMultimedia}>
            <Plus className="h-4 w-4" /> Agregar más multimedia
          </Button>
          <Button type="button" onClick={guardarEvolucion}>
            <FileUp className="h-4 w-4" /> Guardar evolución
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {perfil.estudios.map((e) => {
          const esImagen =
            e.mime_type?.startsWith("image/") ||
            /\.(png|jpe?g|webp|gif)$/i.test(e.nombre_original || e.archivo || "");
          const tieneEvolucion = !!(e.foto_antes_url || e.foto_despues_url);
          const citaRelacionada = e.cita_id ? perfil.citas.find((cita) => cita.id === e.cita_id) : null;
          return (
            <div key={e.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {tieneEvolucion ? (
                <div className="grid gap-2 bg-slate-50 p-3 sm:grid-cols-2">
                  <EstudioFotoLink label="Antes" url={e.foto_antes_url} titulo={e.titulo} />
                  <EstudioFotoLink label="Después" url={e.foto_despues_url} titulo={e.titulo} />
                </div>
              ) : esImagen && e.url ? (
                <a href={e.url} target="_blank" rel="noreferrer" className="block bg-slate-100">
                  <img
                    src={e.url}
                    alt={e.titulo}
                    className="h-48 w-full object-cover transition hover:scale-[1.01]"
                    loading="lazy"
                  />
                </a>
              ) : (
                <div className="flex h-28 items-center justify-center bg-slate-50 text-slate-400">
                  <FileText className="h-8 w-8" />
                </div>
              )}
              <div className="p-3">
                <p className="font-medium">{e.titulo}</p>
                <p className="text-xs text-slate-500">
                  {formatFecha(e.fecha_estudio || "")}
                  {tieneEvolucion ? " · Antes / después" : e.mime_type ? ` · ${esImagen ? "Imagen" : "Archivo"}` : ""}
                </p>
                {citaRelacionada ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Cita: {formatFechaHora(citaRelacionada.fecha_hora)} · {citaRelacionada.motivo || "Consulta"}
                  </p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <a href={e.url} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">
                    {esImagen ? "Ver imagen" : "Ver archivo"}
                  </a>
                  <button
                    type="button"
                    className="text-sm text-rose-600"
                    onClick={async () => {
                      if (!confirm("¿Eliminar?")) return;
                      await api.estudios.remove(e.id);
                      onRefresh();
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EstudioFotoInput({
  label,
  preview,
  fileName,
  onSelect,
  onRemove
}: {
  label: string;
  preview: string | null;
  fileName?: string;
  onSelect: (file?: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50">
            <Camera className="h-3.5 w-3.5" /> Seleccionar
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelect(e.target.files?.[0])} />
        </label>
      </div>
      {preview ? (
        <div className="mt-3">
          <img src={preview} alt={label} className="h-40 w-full rounded-lg object-cover ring-1 ring-slate-200" />
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate">{fileName || "Imagen seleccionada"}</span>
            <button type="button" className="shrink-0 text-rose-600 hover:underline" onClick={onRemove}>
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
          Sin imagen
        </div>
      )}
    </div>
  );
}

function EstudioFotoLink({ label, url, titulo }: { label: string; url?: string | null; titulo: string }) {
  if (!url) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-xs text-slate-400">
        Sin foto {label.toLowerCase()}
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
      <img
        src={url}
        alt={`${label} - ${titulo}`}
        className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
        loading="lazy"
      />
      <span className="block px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
    </a>
  );
}

function RecetasTab({
  perfil,
  cfg,
  onRefresh,
  onOpen
}: {
  perfil: Perfil;
  cfg: ClinicaConfig | null;
  medicos: { id: number; nombre: string }[];
  onRefresh: () => void;
  onOpen: () => void;
}) {
  return (
    <Card>
      <div className="mb-4 flex justify-between">
        <h3 className="font-semibold">Recetas médicas</h3>
        <Button onClick={onOpen}>
          <Plus className="h-4 w-4" /> Nueva receta
        </Button>
      </div>
      {perfil.recetas.length === 0 ? (
        <p className="text-sm text-slate-500">Sin recetas. Cree una y descargue el PDF con membrete.</p>
      ) : (
        perfil.recetas.map((r) => (
          <div key={r.id} className="mb-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{formatFecha(r.fecha)}</p>
                {r.medico_nombre ? <p className="text-xs text-slate-500">{r.medico_nombre}</p> : null}
              </div>
              <div className="flex gap-2">
                {cfg ? (
                  <Button
                    variant="link"
                    onClick={() =>
                      descargarRecetaPdf({
                        cfg,
                        paciente: perfil as unknown as Record<string, string | null | undefined>,
                        receta: r,
                        medicoNombre: r.medico_nombre
                      })
                    }
                  >
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                ) : null}
                <button
                  type="button"
                  className="text-sm text-rose-600 hover:underline"
                  onClick={async () => {
                    if (!confirm("¿Eliminar esta receta?")) return;
                    await api.recetas.remove(r.id);
                    toast.success("Receta eliminada");
                    onRefresh();
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.medicamentos}</pre>
          </div>
        ))
      )}
    </Card>
  );
}

function LabTab({
  perfil,
  cfg,
  onRefresh,
  onOpen
}: {
  perfil: Perfil;
  cfg: ClinicaConfig | null;
  medicos: { id: number; nombre: string }[];
  onRefresh: () => void;
  onOpen: () => void;
}) {
  return (
    <Card>
      <div className="mb-4 flex justify-between">
        <h3 className="font-semibold">Órdenes de laboratorio</h3>
        <Button onClick={onOpen}>
          <Plus className="h-4 w-4" /> Nueva orden
        </Button>
      </div>
      {perfil.ordenes.length === 0 ? (
        <p className="text-sm text-slate-500">Sin órdenes. Genere PDF con membrete de la clínica.</p>
      ) : (
        perfil.ordenes.map((o) => (
          <div key={o.id} className="mb-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{formatFecha(o.fecha)}</p>
                {o.medico_nombre ? <p className="text-xs text-slate-500">{o.medico_nombre}</p> : null}
              </div>
              <div className="flex gap-2">
                {cfg ? (
                  <Button
                    variant="link"
                    onClick={() =>
                      descargarOrdenLabPdf({
                        cfg,
                        paciente: perfil as unknown as Record<string, string | null | undefined>,
                        orden: o,
                        medicoNombre: o.medico_nombre
                      })
                    }
                  >
                    <Download className="h-4 w-4" /> PDF membretado
                  </Button>
                ) : null}
                <button
                  type="button"
                  className="text-sm text-rose-600 hover:underline"
                  onClick={async () => {
                    if (!confirm("¿Eliminar esta orden?")) return;
                    await api.ordenesLab.remove(o.id);
                    toast.success("Orden eliminada");
                    onRefresh();
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{o.estudios_solicitados}</p>
          </div>
        ))
      )}
    </Card>
  );
}

function PagosTab({
  perfil,
  onRefresh,
  onOpen
}: {
  perfil: Perfil;
  onRefresh: () => void;
  onOpen: () => void;
}) {
  const total = perfil.pagos.reduce((s, p) => s + p.monto, 0);
  return (
    <Card>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Historial financiero</h3>
          <p className="text-sm text-slate-500">Total: {formatMoneda(total)}</p>
        </div>
        <Button onClick={onOpen}>
          <Plus className="h-4 w-4" /> Registrar pago
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2">Fecha</th>
            <th>Concepto</th>
            <th>Monto</th>
            <th>Método</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {perfil.pagos.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-slate-500">
                Sin pagos registrados.
              </td>
            </tr>
          ) : (
            perfil.pagos.map((p) => (
              <tr key={p.id} className="border-b border-slate-50">
                <td className="py-2">{formatFecha(p.fecha)}</td>
                <td>{p.concepto}</td>
                <td className="font-medium">{formatMoneda(p.monto)}</td>
                <td>{p.metodo_pago || "—"}</td>
                <td>
                  <button
                    type="button"
                    className="text-rose-600 hover:underline"
                    onClick={async () => {
                      if (!confirm("¿Eliminar este pago?")) return;
                      await api.pagos.remove(p.id);
                      toast.success("Pago eliminado");
                      onRefresh();
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}

function ConsultaModal({
  pacienteId,
  medicos,
  consulta,
  onClose,
  onSaved
}: {
  pacienteId: number;
  medicos: { id: number; nombre: string }[];
  consulta?: Consulta | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!consulta;
  const [form, setForm] = useState({
    medicoId: consulta?.medico_id ? String(consulta.medico_id) : "",
    fecha: consulta?.fecha?.slice(0, 10) || fechaHoyInput(),
    motivo: consulta?.motivo || "",
    diagnostico: consulta?.diagnostico || "",
    tratamiento: consulta?.tratamiento || "",
    notas: consulta?.notas || ""
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoDataBase64, setFotoDataBase64] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(consulta?.foto_seguimiento_url || null);
  const [eliminarFoto, setEliminarFoto] = useState(false);
  const [fotoAntesFile, setFotoAntesFile] = useState<File | null>(null);
  const [fotoAntesDataBase64, setFotoAntesDataBase64] = useState<string | null>(null);
  const [fotoAntesPreview, setFotoAntesPreview] = useState<string | null>(consulta?.foto_antes_url || null);
  const [eliminarFotoAntes, setEliminarFotoAntes] = useState(false);
  const [fotoDespuesFile, setFotoDespuesFile] = useState<File | null>(null);
  const [fotoDespuesDataBase64, setFotoDespuesDataBase64] = useState<string | null>(null);
  const [fotoDespuesPreview, setFotoDespuesPreview] = useState<string | null>(consulta?.foto_despues_url || null);
  const [eliminarFotoDespues, setEliminarFotoDespues] = useState(false);

  async function onFotoEvolucion(tipo: "antes" | "despues", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      toast.error("Seleccione una imagen para la evolución clínica.");
      return;
    }
    try {
      const dataBase64 = await fileToBase64(file);
      if (tipo === "antes") {
        setFotoAntesFile(file);
        setFotoAntesDataBase64(dataBase64);
        setFotoAntesPreview(dataBase64);
        setEliminarFotoAntes(false);
      } else {
        setFotoDespuesFile(file);
        setFotoDespuesDataBase64(dataBase64);
        setFotoDespuesPreview(dataBase64);
        setEliminarFotoDespues(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la imagen");
    }
  }

  function quitarFotoEvolucion(tipo: "antes" | "despues") {
    if (tipo === "antes") {
      setFotoAntesFile(null);
      setFotoAntesDataBase64(null);
      setFotoAntesPreview(null);
      setEliminarFotoAntes(!!consulta?.foto_antes_url);
      return;
    }
    setFotoDespuesFile(null);
    setFotoDespuesDataBase64(null);
    setFotoDespuesPreview(null);
    setEliminarFotoDespues(!!consulta?.foto_despues_url);
  }

  async function onFotoSeguimiento(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      toast.error("Seleccione una imagen para la foto de seguimiento.");
      return;
    }
    try {
      const dataBase64 = await fileToBase64(file);
      setFotoFile(file);
      setFotoDataBase64(dataBase64);
      setFotoPreview(dataBase64);
      setEliminarFoto(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la imagen");
    }
  }

  function quitarFotoSeguimiento() {
    setFotoFile(null);
    setFotoDataBase64(null);
    setFotoPreview(null);
    setEliminarFoto(!!consulta?.foto_seguimiento_url);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const body: Record<string, unknown> = {
        medicoId: form.medicoId ? Number(form.medicoId) : null,
        fecha: form.fecha || fechaHoyInput(),
        motivo: form.motivo || null,
        diagnostico: form.diagnostico || null,
        tratamiento: form.tratamiento || null,
        notas: form.notas || null
      };
      if (fotoFile && fotoDataBase64) {
        body.fotoDataBase64 = fotoDataBase64;
        body.fotoMimeType = fotoFile.type;
        body.fotoNombreArchivo = fotoFile.name;
      }
      if (eliminarFoto) body.eliminarFotoSeguimiento = true;
      if (fotoAntesFile && fotoAntesDataBase64) {
        body.fotoAntesDataBase64 = fotoAntesDataBase64;
        body.fotoAntesMimeType = fotoAntesFile.type;
        body.fotoAntesNombreArchivo = fotoAntesFile.name;
      }
      if (eliminarFotoAntes) body.eliminarFotoAntes = true;
      if (fotoDespuesFile && fotoDespuesDataBase64) {
        body.fotoDespuesDataBase64 = fotoDespuesDataBase64;
        body.fotoDespuesMimeType = fotoDespuesFile.type;
        body.fotoDespuesNombreArchivo = fotoDespuesFile.name;
      }
      if (eliminarFotoDespues) body.eliminarFotoDespues = true;
      if (esEdicion && consulta) {
        await api.consultas.update(consulta.id, body);
        toast.success("Atención clínica actualizada");
      } else {
        await api.consultas.create({ pacienteId, ...body });
        toast.success("Atención clínica registrada en la ficha");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }
  return (
    <Modal open wide title={esEdicion ? "Editar atención clínica" : "Registro de atención clínica"} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-slate-600">
          Complete los campos para incorporar la atención a la ficha clínica formal del expediente.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Médico tratante</Label>
            <Select value={form.medicoId} onChange={(e) => setForm({ ...form, medicoId: e.target.value })}>
              <option value="">— Seleccionar —</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Fecha de atención</Label>
            <Input
              type="date"
              required
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Motivo de consulta</Label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={2}
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            placeholder="Síntomas principales, duración, motivo de la visita…"
          />
        </div>
        <div>
          <Label>Examen físico y observaciones</Label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={3}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            placeholder="Signos vitales, hallazgos, exploración por aparatos…"
          />
        </div>
        <div>
          <Label>Diagnóstico / impresión clínica</Label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={2}
            value={form.diagnostico}
            onChange={(e) => setForm({ ...form, diagnostico: e.target.value })}
          />
        </div>
        <div>
          <Label>Plan de tratamiento e indicaciones</Label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={3}
            value={form.tratamiento}
            onChange={(e) => setForm({ ...form, tratamiento: e.target.value })}
            placeholder="Medicación, estudios solicitados, recomendaciones…"
          />
        </div>
        <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-3">
          <div>
            <Label>Evolución fotográfica antes / después</Label>
            <p className="mt-1 text-xs text-slate-500">
              Opcional. Agregue imágenes de la condición antes y después de la atención o tratamiento de esta cita.
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FotoEvolucionInput
              label="Foto antes"
              preview={fotoAntesPreview}
              fileName={fotoAntesFile?.name || consulta?.foto_antes_nombre_original}
              onChange={(e) => onFotoEvolucion("antes", e)}
              onRemove={() => quitarFotoEvolucion("antes")}
            />
            <FotoEvolucionInput
              label="Foto después"
              preview={fotoDespuesPreview}
              fileName={fotoDespuesFile?.name || consulta?.foto_despues_nombre_original}
              onChange={(e) => onFotoEvolucion("despues", e)}
              onRemove={() => quitarFotoEvolucion("despues")}
            />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Label>Foto adicional de seguimiento</Label>
              <p className="mt-1 text-xs text-slate-500">
                Opcional. Mantiene compatibilidad con registros anteriores que tenían una sola foto.
              </p>
            </div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50">
                <Camera className="h-4 w-4" /> Seleccionar foto
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={onFotoSeguimiento} />
            </label>
          </div>
          {fotoPreview ? (
            <div className="mt-3 flex flex-wrap items-start gap-3">
              <img src={fotoPreview} alt="Foto de seguimiento" className="h-32 w-40 rounded-lg object-cover ring-1 ring-slate-200" />
              <div className="min-w-0 flex-1 text-sm text-slate-600">
                <p className="font-medium text-slate-800">
                  {fotoFile?.name || consulta?.foto_seguimiento_nombre_original || "Foto registrada"}
                </p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-rose-600 hover:underline"
                  onClick={quitarFotoSeguimiento}
                >
                  <X className="h-3.5 w-3.5" /> Quitar foto
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{esEdicion ? "Guardar cambios" : "Registrar en ficha clínica"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function TratamientoModal({
  pacienteId,
  medicos,
  tratamiento,
  onClose,
  onSaved
}: {
  pacienteId: number;
  medicos: { id: number; nombre: string }[];
  tratamiento?: Tratamiento | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!tratamiento;
  const [form, setForm] = useState({
    medicoId: tratamiento?.medico_id ? String(tratamiento.medico_id) : "",
    nombre: tratamiento?.nombre || "",
    descripcion: tratamiento?.descripcion || "",
    fechaInicio: tratamiento?.fecha_inicio?.slice(0, 10) || fechaHoyInput(),
    progresoNotas: tratamiento?.progreso_notas || "",
    estado: (tratamiento?.estado || "activo") as EstadoTratamiento
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      fechaInicio: form.fechaInicio,
      progresoNotas: form.progresoNotas,
      medicoId: form.medicoId ? Number(form.medicoId) : null,
      estado: form.estado
    };
    if (esEdicion && tratamiento) {
      await api.tratamientos.update(tratamiento.id, body);
      toast.success("Tratamiento actualizado");
    } else {
      await api.tratamientos.create({ pacienteId, ...body });
      toast.success("Tratamiento registrado");
    }
    onSaved();
    onClose();
  }
  return (
    <Modal open wide title={esEdicion ? "Editar tratamiento" : "Nuevo tratamiento"} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <div>
          <Label>Médico responsable</Label>
          <Select value={form.medicoId} onChange={(e) => setForm({ ...form, medicoId: e.target.value })}>
            <option value="">— Sin asignar —</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Nombre del tratamiento *</Label>
          <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div>
          <Label>Descripción</Label>
          <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Fecha inicio</Label>
            <Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
          </div>
          {esEdicion ? (
            <div>
              <Label>Estado</Label>
              <Select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoTratamiento })}
              >
                <option value="activo">Activo</option>
                <option value="completado">Completado</option>
                <option value="suspendido">Suspendido</option>
              </Select>
            </div>
          ) : null}
        </div>
        <div>
          <Label>Notas de seguimiento</Label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={form.progresoNotas}
            onChange={(e) => setForm({ ...form, progresoNotas: e.target.value })}
            placeholder="Evolución, adherencia, próximos controles…"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function RecetaModal({
  pacienteId,
  medicos,
  onClose,
  onSaved
}: {
  pacienteId: number;
  medicos: { id: number; nombre: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ medicoId: "", fecha: fechaHoyInput(), medicamentos: "", indicaciones: "" });
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.recetas.create({
        pacienteId,
        medicoId: form.medicoId ? Number(form.medicoId) : null,
        fecha: form.fecha || fechaHoyInput(),
        medicamentos: form.medicamentos.trim() || "Medicamentos por definir",
        indicaciones: form.indicaciones || null
      });
      toast.success("Receta creada");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la receta");
    }
  }
  return (
    <Modal open wide title="Nueva receta médica" onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Médico</Label>
            <Select value={form.medicoId} onChange={(e) => setForm({ ...form, medicoId: e.target.value })}>
              <option value="">— Seleccionar —</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Medicamentos</Label>
          <textarea
            className="w-full rounded-lg border border-slate-200 p-3 text-sm"
            rows={5}
            value={form.medicamentos}
            onChange={(e) => setForm({ ...form, medicamentos: e.target.value })}
            placeholder="Un medicamento por línea…"
          />
        </div>
        <div>
          <Label>Indicaciones</Label>
          <Input value={form.indicaciones} onChange={(e) => setForm({ ...form, indicaciones: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function LabModal({
  pacienteId,
  medicos,
  onClose,
  onSaved
}: {
  pacienteId: number;
  medicos: { id: number; nombre: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    medicoId: "",
    fecha: fechaHoyInput(),
    estudiosSolicitados: "",
    diagnosticoPresuntivo: "",
    notas: ""
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.ordenesLab.create({
        pacienteId,
        medicoId: form.medicoId ? Number(form.medicoId) : null,
        fecha: form.fecha || fechaHoyInput(),
        estudiosSolicitados: form.estudiosSolicitados.trim() || "Estudios de laboratorio",
        diagnosticoPresuntivo: form.diagnosticoPresuntivo || null,
        notas: form.notas || null
      });
      toast.success("Orden creada");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la orden");
    }
  }
  return (
    <Modal open wide title="Orden de laboratorio" onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Médico solicitante</Label>
            <Select value={form.medicoId} onChange={(e) => setForm({ ...form, medicoId: e.target.value })}>
              <option value="">— Seleccionar —</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Estudios solicitados</Label>
          <textarea
            className="w-full rounded-lg border p-3 text-sm"
            rows={4}
            value={form.estudiosSolicitados}
            onChange={(e) => setForm({ ...form, estudiosSolicitados: e.target.value })}
          />
        </div>
        <div>
          <Label>Diagnóstico presuntivo</Label>
          <Input
            value={form.diagnosticoPresuntivo}
            onChange={(e) => setForm({ ...form, diagnosticoPresuntivo: e.target.value })}
          />
        </div>
        <div>
          <Label>Notas</Label>
          <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function PagoModal({ pacienteId, onClose, onSaved }: { pacienteId: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ concepto: "", monto: "", fecha: fechaHoyInput(), metodoPago: "efectivo", referencia: "" });
  async function submit(e: FormEvent) {
    e.preventDefault();
    await api.pagos.create({ pacienteId, ...form, monto: Number(form.monto) });
    toast.success("Pago registrado");
    onSaved();
    onClose();
  }
  return (
    <Modal open title="Registrar pago" onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <div><Label>Concepto *</Label><Input required value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} /></div>
        <div><Label>Monto (MXN) *</Label><Input type="number" step="0.01" required value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></div>
        <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
        <div><Label>Método</Label><Select value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></Select></div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar</Button></div>
      </form>
    </Modal>
  );
}
