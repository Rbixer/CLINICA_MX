import type { Cita, EstadoCita } from "../../types";
import { formatHora } from "../../utils/format";

const CHIP: Record<EstadoCita, string> = {
  pendiente: "border-l-amber-500 bg-amber-50 text-amber-900",
  confirmada: "border-l-blue-600 bg-blue-50 text-blue-900",
  atendida: "border-l-emerald-600 bg-emerald-50 text-emerald-900",
  cancelada: "border-l-slate-400 bg-slate-100 text-slate-600 line-through",
  no_asistio: "border-l-rose-500 bg-rose-50 text-rose-900"
};

export default function CitaChip({
  cita,
  compact,
  onClick
}: {
  cita: Cita;
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 block w-full rounded border-l-[3px] px-1.5 py-1 text-left transition hover:ring-1 hover:ring-primary-300 ${CHIP[cita.estado]}`}
    >
      <span className={`font-semibold ${compact ? "text-[10px]" : "text-xs"}`}>{formatHora(cita.fecha_hora)}</span>
      <span className={`block truncate font-medium ${compact ? "text-[10px]" : "text-xs"}`}>{cita.paciente_nombre}</span>
      {!compact && cita.medico_nombre ? (
        <span className="block truncate text-[10px] opacity-80">{cita.medico_nombre}</span>
      ) : null}
    </button>
  );
}
