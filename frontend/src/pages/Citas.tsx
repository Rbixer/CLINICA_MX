import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../api";
import AgendaDia from "../components/agenda/AgendaDia";
import AgendaSemanal from "../components/agenda/AgendaSemanal";
import CalendarioMensual from "../components/agenda/CalendarioMensual";
import ListaCitasDia from "../components/agenda/ListaCitasDia";
import { Button, Card, Input, Label, Modal, PageHeader, Select } from "../components/ui";
import type { Cita, EstadoCita, Medico, Paciente } from "../types";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  esHoy,
  fechaParte,
  startOfMonth,
  startOfWeek,
  tituloMes,
  tituloSemana,
  toDatetimeLocal
} from "../utils/calendar";
import { estadoCitaClass, estadoCitaLabel, fechaHoyInput, formatFechaHora } from "../utils/format";

const ESTADOS: EstadoCita[] = ["pendiente", "confirmada", "atendida", "cancelada", "no_asistio"];
type Vista = "mes" | "semana" | "dia" | "lista";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "mes", label: "Mes" },
  { id: "semana", label: "Semana" },
  { id: "dia", label: "Día" },
  { id: "lista", label: "Lista" }
];

const LEYENDA: { estado: EstadoCita; label: string; dot: string }[] = [
  { estado: "pendiente", label: "Pendiente", dot: "bg-amber-500" },
  { estado: "confirmada", label: "Confirmada", dot: "bg-blue-600" },
  { estado: "atendida", label: "Atendida", dot: "bg-emerald-600" },
  { estado: "cancelada", label: "Cancelada", dot: "bg-slate-400" },
  { estado: "no_asistio", label: "No asistió", dot: "bg-rose-500" }
];

const nuevoPacienteVacio = {
  nombre: "",
  dpi: "",
  telefono: "",
  email: "",
  direccion: "",
  fechaNacimiento: "",
  sexo: "",
  alergias: "",
  notas: ""
};

function rangoVista(vista: Vista, fecha: string, mesRef: string): { desde: string; hasta: string } {
  if (vista === "mes") return { desde: startOfMonth(mesRef), hasta: endOfMonth(mesRef) };
  if (vista === "semana") return { desde: startOfWeek(fecha), hasta: endOfWeek(fecha) };
  return { desde: fecha, hasta: fecha };
}

export default function Citas() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [citasRango, setCitasRango] = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [fecha, setFecha] = useState(fechaHoyInput());
  const [mesRef, setMesRef] = useState(() => startOfMonth(fechaHoyInput()));
  const [vista, setVista] = useState<Vista>("mes");
  const listaDiaRef = useRef<HTMLDivElement>(null);
  const [filtroMedico, setFiltroMedico] = useState("");
  const [modalNueva, setModalNueva] = useState(false);
  const [citaDetalle, setCitaDetalle] = useState<Cita | null>(null);
  const [crearPaciente, setCrearPaciente] = useState(false);
  const [nuevoPaciente, setNuevoPaciente] = useState(nuevoPacienteVacio);
  const [form, setForm] = useState({
    pacienteId: "",
    medicoId: "",
    fechaHora: "",
    motivo: "",
    estado: "pendiente" as EstadoCita,
    notas: ""
  });

  const citasFiltradas = useMemo(() => {
    const fuente = vista === "dia" || vista === "lista" ? citas : citasRango;
    if (!filtroMedico) return fuente;
    return fuente.filter((c) => String(c.medico_id ?? "") === filtroMedico);
  }, [citas, citasRango, filtroMedico, vista]);

  const citasDiaSeleccionado = useMemo(() => {
    const delRango = citasFiltradas
      .filter((c) => fechaParte(c.fecha_hora) === fecha)
      .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    if (delRango.length > 0 || vista === "dia" || vista === "lista") return delRango;
    const delDia = (filtroMedico ? citas.filter((c) => String(c.medico_id ?? "") === filtroMedico) : citas).sort((a, b) =>
      a.fecha_hora.localeCompare(b.fecha_hora)
    );
    return delDia;
  }, [citasFiltradas, citas, fecha, filtroMedico, vista]);

  const load = useCallback(async () => {
    try {
      const { desde, hasta } = rangoVista(vista, fecha, mesRef);
      const necesitaRango = vista === "mes" || vista === "semana";
      const [p, m, delDia, rango] = await Promise.all([
        api.pacientes.list(),
        api.medicos.list(),
        api.citas.list({ fecha }),
        necesitaRango ? api.citas.rango(desde, hasta) : Promise.resolve([] as Cita[])
      ]);
      setPacientes(p);
      setMedicos(m);
      setCitas(delDia);
      setCitasRango(rango);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar agenda");
    }
  }, [fecha, vista, mesRef]);

  useEffect(() => {
    load();
  }, [load]);

  function irHoy() {
    const hoy = fechaHoyInput();
    setFecha(hoy);
    setMesRef(startOfMonth(hoy));
  }

  function navegar(delta: number) {
    if (vista === "mes") setMesRef(addMonths(mesRef, delta));
    else if (vista === "semana") setFecha(addDays(fecha, delta * 7));
    else setFecha(addDays(fecha, delta));
  }

  function tituloNavegacion() {
    if (vista === "mes") return tituloMes(mesRef);
    if (vista === "semana") return tituloSemana(fecha);
    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-GT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function abrirNueva(hora?: string) {
    setCrearPaciente(false);
    setNuevoPaciente(nuevoPacienteVacio);
    setForm({
      pacienteId: "",
      medicoId: filtroMedico,
      fechaHora: hora || `${fecha}T09:00`,
      motivo: "",
      estado: "pendiente",
      notas: ""
    });
    setModalNueva(true);
  }

  function abrirDetalle(c: Cita) {
    setCitaDetalle(c);
    setForm({
      pacienteId: String(c.paciente_id),
      medicoId: c.medico_id ? String(c.medico_id) : "",
      fechaHora: toDatetimeLocal(c.fecha_hora),
      motivo: c.motivo || "",
      estado: c.estado,
      notas: c.notas || ""
    });
  }

  async function onSubmitNueva(e: FormEvent) {
    e.preventDefault();
    try {
      let pacienteId = form.pacienteId ? Number(form.pacienteId) : null;
      if (crearPaciente) {
        const paciente = await api.pacientes.create({
          nombre: nuevoPaciente.nombre || "Paciente sin nombre",
          dpi: nuevoPaciente.dpi || null,
          telefono: nuevoPaciente.telefono || null,
          email: nuevoPaciente.email || null,
          direccion: nuevoPaciente.direccion || null,
          fechaNacimiento: nuevoPaciente.fechaNacimiento || null,
          sexo: nuevoPaciente.sexo || null,
          alergias: nuevoPaciente.alergias || null,
          notas: nuevoPaciente.notas || null
        });
        pacienteId = paciente.id;
        setPacientes((actual) => [...actual, paciente].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }

      await api.citas.create({
        paciente_id: pacienteId,
        medico_id: form.medicoId ? Number(form.medicoId) : null,
        fecha_hora: form.fechaHora || null,
        motivo: form.motivo || null,
        estado: form.estado,
        notas: form.notas || null
      });
      toast.success("Cita agendada");
      setModalNueva(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function onSubmitEditar(e: FormEvent) {
    e.preventDefault();
    if (!citaDetalle) return;
    try {
      await api.citas.update(citaDetalle.id, {
        medico_id: form.medicoId ? Number(form.medicoId) : null,
        fecha_hora: form.fechaHora || null,
        motivo: form.motivo || null,
        estado: form.estado,
        notas: form.notas || null
      });
      toast.success("Cita actualizada");
      setCitaDetalle(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function eliminar(id: number) {
    if (!confirm("¿Eliminar esta cita?")) return;
    try {
      await api.citas.remove(id);
      toast.success("Cita eliminada");
      setCitaDetalle(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  function seleccionarDia(d: string) {
    setFecha(d);
    const mesDia = startOfMonth(d);
    if (mesDia !== mesRef) setMesRef(mesDia);
    requestAnimationFrame(() => {
      listaDiaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function cambiarFechaInput(nueva: string) {
    setFecha(nueva);
    setMesRef(startOfMonth(nueva));
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Calendarización y visualización de citas por fecha"
        action={
          <Button onClick={() => abrirNueva()}>
            <Plus className="h-4 w-4" /> Nueva cita
          </Button>
        }
      />

      <Card className="mb-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary-600" />
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVista(v.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    vista === v.id ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={irHoy} className={esHoy(fecha) ? "ring-2 ring-primary-300" : ""}>
              Hoy
            </Button>
            <div className="flex items-center rounded-lg border border-slate-200">
              <button
                type="button"
                className="rounded-l-lg p-2 hover:bg-slate-50"
                onClick={() => navegar(-1)}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[10rem] px-2 text-center text-sm font-semibold capitalize text-slate-800">
                {tituloNavegacion()}
              </span>
              <button
                type="button"
                className="rounded-r-lg p-2 hover:bg-slate-50"
                onClick={() => navegar(1)}
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <div>
            <Label>Ir a fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => cambiarFechaInput(e.target.value)} />
          </div>
          <div>
            <Label>Filtrar por médico</Label>
            <Select value={filtroMedico} onChange={(e) => setFiltroMedico(e.target.value)} className="min-w-[12rem]">
              <option value="">Todos los médicos</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {LEYENDA.map(({ estado, label, dot }) => (
              <span key={estado} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {vista === "mes" ? (
        <>
          <CalendarioMensual
            refFecha={mesRef}
            citas={citasFiltradas}
            fechaSeleccionada={fecha}
            onSelectDia={seleccionarDia}
            onSelectCita={abrirDetalle}
          />
          <div ref={listaDiaRef}>
            <ListaCitasDia
              fecha={fecha}
              citas={citasDiaSeleccionado}
              onSelectCita={abrirDetalle}
              onNuevaCita={() => abrirNueva(`${fecha}T09:00`)}
            />
          </div>
        </>
      ) : null}

      {vista === "semana" ? (
        <>
          <AgendaSemanal
            refFecha={fecha}
            citas={citasFiltradas}
            fechaSeleccionada={fecha}
            onSelectDia={seleccionarDia}
            onSelectCita={abrirDetalle}
          />
          <ListaCitasDia
            fecha={fecha}
            citas={citasDiaSeleccionado}
            onSelectCita={abrirDetalle}
            onNuevaCita={() => abrirNueva(`${fecha}T09:00`)}
          />
        </>
      ) : null}

      {vista === "dia" ? (
        <Card>
          <div className="mb-4 flex justify-between">
            <h3 className="font-semibold text-slate-900">Agenda del día</h3>
            <Button variant="secondary" onClick={() => abrirNueva(`${fecha}T09:00`)}>
              <Plus className="h-4 w-4" /> Cita este día
            </Button>
          </div>
          <AgendaDia fecha={fecha} citas={citasFiltradas} onSelectCita={abrirDetalle} />
        </Card>
      ) : null}

      {vista === "lista" ? (
        <Card className="overflow-x-auto p-0">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <List className="h-4 w-4 text-slate-500" />
            <h3 className="font-semibold">Citas del {formatFechaHora(`${fecha}T12:00:00`).split(",")[0]}</h3>
          </div>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Médico</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {citasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No hay citas para esta fecha.
                  </td>
                </tr>
              ) : (
                citasFiltradas.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">{formatFechaHora(c.fecha_hora)}</td>
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/pacientes/${c.paciente_id}`} className="text-primary-600 hover:underline">
                        {c.paciente_nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c.medico_nombre || "—"}</td>
                    <td className="px-4 py-3">{c.motivo || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoCitaClass(c.estado)}`}>
                        {estadoCitaLabel(c.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" onClick={() => abrirDetalle(c)}>
                        Ver / editar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      ) : null}

      <Modal open={modalNueva} wide title="Agendar nueva cita" onClose={() => setModalNueva(false)}>
        <FormularioCita
          form={form}
          setForm={setForm}
          pacientes={pacientes}
          medicos={medicos}
          onSubmit={onSubmitNueva}
          onCancel={() => setModalNueva(false)}
          submitLabel="Agendar cita"
          crearPaciente={crearPaciente}
          setCrearPaciente={setCrearPaciente}
          nuevoPaciente={nuevoPaciente}
          setNuevoPaciente={setNuevoPaciente}
        />
      </Modal>

      <Modal open={!!citaDetalle} wide title="Detalle de cita" onClose={() => setCitaDetalle(null)}>
        {citaDetalle ? (
        <FormularioCita
          form={form}
          setForm={setForm}
          pacientes={pacientes}
          medicos={medicos}
          pacienteSoloLectura
          onSubmit={onSubmitEditar}
          onCancel={() => setCitaDetalle(null)}
          submitLabel="Guardar cambios"
          extra={
              <div className="flex justify-between border-t border-slate-100 pt-4">
                <Button type="button" variant="danger" onClick={() => eliminar(citaDetalle.id)}>
                  Eliminar cita
                </Button>
                <Link
                  to={`/pacientes/${citaDetalle.paciente_id}`}
                  className="self-center text-sm text-primary-600 hover:underline"
                >
                  Ver expediente del paciente
                </Link>
                <Link
                  to={`/pacientes/${citaDetalle.paciente_id}?tab=historia`}
                  className="self-center text-sm text-primary-600 hover:underline"
                >
                  Registrar atención clínica
                </Link>
              </div>
            }
          />
        ) : null}
      </Modal>
    </>
  );
}

function FormularioCita({
  form,
  setForm,
  pacientes,
  medicos,
  onSubmit,
  onCancel,
  submitLabel,
  pacienteSoloLectura,
  crearPaciente,
  setCrearPaciente,
  nuevoPaciente,
  setNuevoPaciente,
  extra
}: {
  form: {
    pacienteId: string;
    medicoId: string;
    fechaHora: string;
    motivo: string;
    estado: EstadoCita;
    notas: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      pacienteId: string;
      medicoId: string;
      fechaHora: string;
      motivo: string;
      estado: EstadoCita;
      notas: string;
    }>
  >;
  pacientes: Paciente[];
  medicos: Medico[];
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  pacienteSoloLectura?: boolean;
  crearPaciente?: boolean;
  setCrearPaciente?: React.Dispatch<React.SetStateAction<boolean>>;
  nuevoPaciente?: typeof nuevoPacienteVacio;
  setNuevoPaciente?: React.Dispatch<React.SetStateAction<typeof nuevoPacienteVacio>>;
  extra?: ReactNode;
}) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      {!pacienteSoloLectura && setCrearPaciente ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCrearPaciente(false)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                !crearPaciente ? "bg-primary-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Paciente existente
            </button>
            <button
              type="button"
              onClick={() => {
                setCrearPaciente(true);
                setForm({ ...form, pacienteId: "" });
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                crearPaciente ? "bg-primary-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Nuevo paciente
            </button>
          </div>

          {crearPaciente && nuevoPaciente && setNuevoPaciente ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label>Nombre del paciente</Label>
                  <Input
                    value={nuevoPaciente.nombre}
                    onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, nombre: e.target.value })}
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <Label>DPI</Label>
                  <Input
                    value={nuevoPaciente.dpi}
                    onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, dpi: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={nuevoPaciente.telefono}
                    onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, telefono: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={nuevoPaciente.email}
                    onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <Label>Sexo</Label>
                  <Select
                    value={nuevoPaciente.sexo}
                    onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, sexo: e.target.value })}
                  >
                    <option value="">—</option>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Dirección</Label>
                  <Input
                    value={nuevoPaciente.direccion}
                    onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, direccion: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fecha de nacimiento</Label>
                  <Input
                    type="date"
                    value={nuevoPaciente.fechaNacimiento}
                    onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, fechaNacimiento: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Alergias</Label>
                  <Input
                    value={nuevoPaciente.alergias}
                    onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, alergias: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notas del paciente</Label>
                  <Input
                    value={nuevoPaciente.notas}
                    onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, notas: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <Label>Paciente</Label>
              <Select value={form.pacienteId} onChange={(e) => setForm({ ...form, pacienteId: e.target.value })}>
                <option value="">Seleccionar…</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {p.dpi || "sin DPI"}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      ) : (
        <div>
          <Label>Paciente</Label>
          <Select
            disabled={pacienteSoloLectura}
            value={form.pacienteId}
            onChange={(e) => setForm({ ...form, pacienteId: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — {p.dpi || "sin DPI"}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Médico</Label>
          <Select value={form.medicoId} onChange={(e) => setForm({ ...form, medicoId: e.target.value })}>
            <option value="">Sin asignar</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} ({m.especialidad})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Fecha y hora</Label>
          <Input
            type="datetime-local"
            value={form.fechaHora}
            onChange={(e) => setForm({ ...form, fechaHora: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Motivo de la cita</Label>
        <Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
      </div>
      <div>
        <Label>Notas internas</Label>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={2}
          value={form.notas}
          onChange={(e) => setForm({ ...form, notas: e.target.value })}
        />
      </div>
      <div>
        <Label>Estado</Label>
        <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoCita })}>
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {estadoCitaLabel(s)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
      {extra}
    </form>
  );
}
