import type { Cita } from "../../types";
import { diasSemana, esHoy, fechaParte } from "../../utils/calendar";
import CitaChip from "./CitaChip";

export default function AgendaSemanal({
  refFecha,
  citas,
  fechaSeleccionada,
  onSelectDia,
  onSelectCita
}: {
  refFecha: string;
  citas: Cita[];
  fechaSeleccionada: string;
  onSelectDia: (fecha: string) => void;
  onSelectCita: (cita: Cita) => void;
}) {
  const dias = diasSemana(refFecha);

  return (
    <div className="grid gap-2 lg:grid-cols-7">
      {dias.map((d) => {
        const delDia = citas.filter((c) => fechaParte(c.fecha_hora) === d).sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
        const hoy = esHoy(d);
        const activo = d === fechaSeleccionada;
        return (
          <div
            key={d}
            className={`flex min-h-[200px] flex-col rounded-xl border p-2 ${
              activo ? "border-primary-400 bg-primary-50/30 ring-1 ring-primary-300" : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectDia(d)}
              className={`mb-2 rounded-lg px-2 py-1.5 text-left ${hoy ? "bg-primary-600 text-white" : "hover:bg-slate-50"}`}
            >
              <p className="text-xs font-semibold uppercase opacity-80">
                {new Date(`${d}T12:00:00`).toLocaleDateString("es-GT", { weekday: "short" })}
              </p>
              <p className="text-lg font-bold leading-tight">
                {new Date(`${d}T12:00:00`).toLocaleDateString("es-GT", { day: "numeric", month: "short" })}
              </p>
              <p className="text-[10px] opacity-80">{delDia.length} cita{delDia.length === 1 ? "" : "s"}</p>
            </button>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {delDia.length === 0 ? (
                <p className="px-1 text-xs italic text-slate-400">Sin citas</p>
              ) : (
                delDia.map((c) => <CitaChip key={c.id} cita={c} onClick={() => onSelectCita(c)} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
