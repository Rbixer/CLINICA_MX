import { Link } from "react-router-dom";
import type { Cita } from "../../types";
import { estadoCitaClass, estadoCitaLabel, formatFechaHora, formatHora } from "../../utils/format";
import { horaParte } from "../../utils/calendar";

const HORA_INICIO = 7;
const HORA_FIN = 20;

export default function AgendaDia({
  fecha,
  citas,
  onSelectCita
}: {
  fecha: string;
  citas: Cita[];
  onSelectCita: (cita: Cita) => void;
}) {
  const ordenadas = [...citas].sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
  const slots = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i);

  function citasEnHora(h: number) {
    return ordenadas.filter((c) => {
      const mins = horaParte(c.fecha_hora);
      return mins >= h * 60 && mins < (h + 1) * 60;
    });
  }

  const fueraHorario = ordenadas.filter((c) => {
    const h = Math.floor(horaParte(c.fecha_hora) / 60);
    return h < HORA_INICIO || h > HORA_FIN;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {new Date(`${fecha}T12:00:00`).toLocaleDateString("es-GT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        })}
        {" · "}
        <strong>{ordenadas.length}</strong> {ordenadas.length === 1 ? "cita programada" : "citas programadas"}
      </p>

      {fueraHorario.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-amber-800">Fuera del horario habitual</p>
          {fueraHorario.map((c) => (
            <CitaFila key={c.id} cita={c} onClick={() => onSelectCita(c)} />
          ))}
        </div>
      ) : null}

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {slots.map((h) => {
          const delSlot = citasEnHora(h);
          return (
            <div key={h} className="flex gap-3 p-2 sm:p-3">
              <div className="w-14 shrink-0 pt-1 text-right text-xs font-medium text-slate-500">
                {String(h).padStart(2, "0")}:00
              </div>
              <div className="min-h-[2.5rem] flex-1">
                {delSlot.length === 0 ? (
                  <span className="text-xs text-slate-300">—</span>
                ) : (
                  delSlot.map((c) => <CitaFila key={c.id} cita={c} onClick={() => onSelectCita(c)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ordenadas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-slate-500">
          No hay citas agendadas para este día.
        </p>
      ) : null}
    </div>
  );
}

function CitaFila({ cita, onClick }: { cita: Cita; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex w-full items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-left transition hover:border-primary-200 hover:bg-primary-50/30"
    >
      <span className="shrink-0 rounded-md bg-white px-2 py-1 text-sm font-bold text-primary-700 shadow-sm">
        {formatHora(cita.fecha_hora)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{cita.paciente_nombre}</p>
        <p className="text-sm text-slate-600">{cita.medico_nombre || "Médico sin asignar"}</p>
        {cita.motivo ? <p className="mt-1 text-sm text-slate-500">{cita.motivo}</p> : null}
        <p className="mt-1 text-xs text-slate-400">{formatFechaHora(cita.fecha_hora)}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${estadoCitaClass(cita.estado)}`}>
        {estadoCitaLabel(cita.estado)}
      </span>
      {cita.paciente_id ? (
        <Link
          to={`/pacientes/${cita.paciente_id}`}
          className="shrink-0 text-xs text-primary-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Expediente
        </Link>
      ) : null}
    </button>
  );
}
