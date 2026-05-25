import type { Cita } from "../../types";
import { diasCalendarioMes, esHoy, fechaParte } from "../../utils/calendar";
import CitaChip from "./CitaChip";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarioMensual({
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
  const celdas = diasCalendarioMes(refFecha);
  const porDia = new Map<string, Cita[]>();
  for (const c of citas) {
    const d = fechaParte(c.fecha_hora);
    if (!porDia.has(d)) porDia.set(d, []);
    porDia.get(d)!.push(c);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {DIAS.map((d) => (
          <div key={d} className="px-1 py-2 text-center text-xs font-semibold uppercase text-slate-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {celdas.map(({ fecha, enMes }) => {
          const delDia = porDia.get(fecha) ?? [];
          const seleccionado = fecha === fechaSeleccionada;
          const hoy = esHoy(fecha);
          return (
            <div
              key={fecha}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDia(fecha)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDia(fecha);
                }
              }}
              className={`min-h-[88px] cursor-pointer border-b border-r border-slate-100 p-1 text-left transition sm:min-h-[100px] ${
                !enMes ? "bg-slate-50/80" : "bg-white hover:bg-slate-50/60"
              } ${seleccionado ? "bg-primary-50/80 ring-2 ring-inset ring-primary-500" : ""}`}
            >
              <span
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  seleccionado
                    ? "bg-primary-600 text-white"
                    : hoy
                      ? "bg-primary-100 font-bold text-primary-800"
                      : "text-slate-700"
                } ${!enMes ? "opacity-50" : ""}`}
              >
                {new Date(`${fecha}T12:00:00`).getDate()}
              </span>
              <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                {delDia.slice(0, 3).map((c) => (
                  <CitaChip key={c.id} cita={c} compact onClick={() => onSelectCita(c)} />
                ))}
                {delDia.length > 3 ? (
                  <button
                    type="button"
                    className="w-full text-left text-[10px] font-medium text-primary-600 hover:underline"
                    onClick={() => onSelectDia(fecha)}
                  >
                    +{delDia.length - 3} más
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
