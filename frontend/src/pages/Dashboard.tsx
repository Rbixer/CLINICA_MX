import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  FlaskConical,
  Pill,
  Stethoscope,
  Users
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Cita, DashboardData } from "../types";
import CalendarioMensual from "../components/agenda/CalendarioMensual";
import { Card } from "../components/ui";
import { addMonths, endOfMonth, fechaParte, startOfMonth, tituloMes } from "../utils/calendar";
import {
  estadoCitaClass,
  estadoCitaLabel,
  fechaHoyInput,
  formatHora,
  formatMoneda,
  formatNumero
} from "../utils/format";

export default function Dashboard() {
  const hoyLabel = fechaHoyInput();
  const [data, setData] = useState<DashboardData | null>(null);
  const [citasMes, setCitasMes] = useState<Cita[]>([]);
  const [calendarioFecha, setCalendarioFecha] = useState(hoyLabel);
  const [calendarioMes, setCalendarioMes] = useState(() => startOfMonth(hoyLabel));
  const [loading, setLoading] = useState(true);
  const [loadingCalendario, setLoadingCalendario] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.dashboard();
      setData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCalendario = useCallback(async () => {
    try {
      setLoadingCalendario(true);
      const citas = await api.citas.rango(startOfMonth(calendarioMes), endOfMonth(calendarioMes));
      setCitasMes(citas);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar calendario");
    } finally {
      setLoadingCalendario(false);
    }
  }, [calendarioMes]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    loadCalendario();
  }, [loadCalendario]);

  function seleccionarDiaCalendario(fecha: string) {
    setCalendarioFecha(fecha);
    const mesDia = startOfMonth(fecha);
    if (mesDia !== calendarioMes) setCalendarioMes(mesDia);
  }

  function navegarCalendario(delta: number) {
    const nuevoMes = addMonths(calendarioMes, delta);
    setCalendarioMes(nuevoMes);
    setCalendarioFecha(nuevoMes);
  }

  const stats = [
    {
      label: "Pacientes Totales",
      value: formatNumero(data?.totales.pacientes ?? 0),
      icon: Users,
      iconBg: "bg-blue-100 text-blue-600"
    },
    {
      label: "Citas del Día",
      value: formatNumero(data?.totales.citas_hoy ?? 0),
      icon: Calendar,
      iconBg: "bg-emerald-100 text-emerald-600"
    },
    {
      label: "Ingresos del Mes",
      value: formatMoneda(data?.totales.ingresos_mes ?? 0),
      icon: DollarSign,
      iconBg: "bg-violet-100 text-violet-600"
    },
    {
      label: "Próximas Citas",
      value: formatNumero(data?.totales.proximas_citas ?? 0),
      icon: CalendarClock,
      iconBg: "bg-orange-100 text-orange-600"
    }
  ];

  const citasHoy = data?.citas_hoy ?? [];
  const citasDiaCalendario = citasMes
    .filter((cita) => fechaParte(cita.fecha_hora) === calendarioFecha)
    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Resumen de su clínica</p>
        </div>
        <Link
          to="/citas"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Ver agenda completa
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, iconBg }) => (
              <Card key={label} className="flex items-center gap-4 !p-5">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Calendario de citas</h3>
                <p className="text-sm capitalize text-slate-500">{tituloMes(calendarioMes)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadCalendario()}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50"
                >
                  Actualizar
                </button>
                <div className="flex items-center rounded-lg border border-slate-200">
                  <button
                    type="button"
                    className="rounded-l-lg p-2 hover:bg-slate-50"
                    onClick={() => navegarCalendario(-1)}
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => seleccionarDiaCalendario(hoyLabel)}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    className="rounded-r-lg p-2 hover:bg-slate-50"
                    onClick={() => navegarCalendario(1)}
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Link
                  to="/citas"
                  className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Agenda completa
                </Link>
              </div>
            </div>

            {loadingCalendario ? (
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Cargando calendario…
              </p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
                <CalendarioMensual
                  refFecha={calendarioMes}
                  citas={citasMes}
                  fechaSeleccionada={calendarioFecha}
                  onSelectDia={seleccionarDiaCalendario}
                  onSelectCita={(cita) => seleccionarDiaCalendario(fechaParte(cita.fecha_hora))}
                />
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Día seleccionado</p>
                  <h4 className="mt-1 text-base font-semibold capitalize text-slate-900">
                    {new Date(`${calendarioFecha}T12:00:00`).toLocaleDateString("es-GT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long"
                    })}
                  </h4>
                  <div className="mt-4 space-y-2">
                    {citasDiaCalendario.length ? (
                      citasDiaCalendario.map((cita) => (
                        <div key={cita.id} className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {formatHora(cita.fecha_hora)} · {cita.paciente_nombre || "Sin paciente"}
                              </p>
                              <p className="text-xs text-slate-500">{cita.medico_nombre || "Sin médico"}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoCitaClass(
                                cita.estado
                              )}`}
                            >
                              {estadoCitaLabel(cita.estado)}
                            </span>
                          </div>
                          {cita.paciente_id ? (
                            <Link
                              to={`/pacientes/${cita.paciente_id}`}
                              className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline"
                            >
                              Ver expediente
                            </Link>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg bg-white px-3 py-8 text-center text-sm text-slate-500">
                        No hay citas en esta fecha.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="mb-6 !p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Citas de hoy</h3>
                <p className="text-xs text-slate-500">
                  {new Date(`${hoyLabel}T12:00:00`).toLocaleDateString("es-GT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                  {" · "}
                  {citasHoy.length} cita{citasHoy.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => load()}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Actualizar
              </button>
            </div>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Hora</th>
                    <th className="px-5 py-3">Paciente</th>
                    <th className="px-5 py-3">Médico</th>
                    <th className="px-5 py-3">Motivo</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {citasHoy.length ? (
                    citasHoy.map((cita) => <FilaCitaHoy key={cita.id} cita={cita} />)
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        No hay citas programadas para hoy.{" "}
                        <Link to="/citas" className="font-medium text-primary-600 hover:underline">
                          Agendar una cita
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-base font-semibold text-slate-900">Citas por Semana</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.chart_citas_semana ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="citas"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: "#2563eb", r: 4 }}
                      name="Citas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-base font-semibold text-slate-900">Ingresos por Mes</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.chart_ingresos_mes ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip formatter={(v: number) => formatMoneda(v)} />
                    <Bar dataKey="ingresos" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Ingresos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="mb-4 text-base font-semibold text-slate-900">Módulos del sistema</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ModLink to="/pacientes" icon={Users} title="Pacientes" desc="Registro, foto, filtros, expediente" />
              <ModLink to="/citas" icon={Calendar} title="Agenda" desc="Calendario mes, semana y día" />
              <ModLink to="/doctores" icon={Stethoscope} title="Doctores" desc="Médicos y especialidades" />
              <ModLink to="/pagos" icon={DollarSign} title="Pagos" desc="Historial financiero" />
              <ModLink to="/pacientes" icon={ClipboardList} title="Historia clínica" desc="Desde expediente del paciente" />
              <ModLink to="/pacientes" icon={FlaskConical} title="Estudios y laboratorio" desc="PDF, imágenes, órdenes lab" />
              <ModLink to="/pacientes" icon={Pill} title="Recetas PDF" desc="Desde expediente → Recetas" />
              <ModLink to="/configuracion" icon={FileText} title="Membrete PDF" desc="Datos de la clínica" />
              <ModLink to="/ayuda" icon={ClipboardList} title="Ayuda" desc="Guía de todos los módulos" />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function FilaCitaHoy({ cita }: { cita: Cita }) {
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/50">
      <td className="px-5 py-3.5 font-medium text-slate-800">{formatHora(cita.fecha_hora)}</td>
      <td className="px-5 py-3.5 text-slate-700">{cita.paciente_nombre || "Sin paciente"}</td>
      <td className="px-5 py-3.5 text-slate-600">{cita.medico_nombre || "—"}</td>
      <td className="px-5 py-3.5 text-slate-600">{cita.motivo || "Consulta general"}</td>
      <td className="px-5 py-3.5">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoCitaClass(cita.estado)}`}
        >
          {estadoCitaLabel(cita.estado)}
        </span>
      </td>
      <td className="px-5 py-3.5">
        {cita.paciente_id ? (
          <Link
            to={`/pacientes/${cita.paciente_id}`}
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            Ver expediente
          </Link>
        ) : (
          <Link to="/citas" className="font-medium text-primary-600 hover:underline">
            Ver en agenda
          </Link>
        )}
      </td>
    </tr>
  );
}

function ModLink({
  to,
  icon: Icon,
  title,
  desc
}: {
  to: string;
  icon: typeof Users;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-primary-200 hover:bg-primary-50/50"
    >
      <span className="rounded-lg bg-primary-100 p-2 text-primary-600">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{desc}</span>
      </span>
    </Link>
  );
}
