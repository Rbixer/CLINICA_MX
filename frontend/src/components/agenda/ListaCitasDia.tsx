import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import type { Cita } from "../../types";
import { Button, Card } from "../ui";
import { estadoCitaClass, estadoCitaLabel, formatHora } from "../../utils/format";

export default function ListaCitasDia({
  fecha,
  citas,
  onSelectCita,
  onNuevaCita
}: {
  fecha: string;
  citas: Cita[];
  onSelectCita: (cita: Cita) => void;
  onNuevaCita?: () => void;
}) {
  const tituloFecha = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <Card className="mt-4 overflow-hidden !p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <h3 className="font-semibold text-slate-900">Pacientes del día</h3>
          <p className="text-sm capitalize text-slate-500">{tituloFecha}</p>
        </div>
        {onNuevaCita ? (
          <Button variant="secondary" onClick={onNuevaCita}>
            <Plus className="h-4 w-4" /> Nueva cita
          </Button>
        ) : null}
      </div>
      <div className="table-scroll overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 sm:px-5">Hora</th>
              <th className="px-4 py-3 sm:px-5">Paciente</th>
              <th className="px-4 py-3 sm:px-5">Médico</th>
              <th className="px-4 py-3 sm:px-5">Motivo</th>
              <th className="px-4 py-3 sm:px-5">Estado</th>
              <th className="px-4 py-3 sm:px-5">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {citas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  No hay pacientes con cita para esta fecha.
                </td>
              </tr>
            ) : (
              citas.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3.5 font-medium text-slate-800 sm:px-5">{formatHora(c.fecha_hora)}</td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <Link to={`/pacientes/${c.paciente_id}`} className="font-medium text-primary-600 hover:underline">
                      {c.paciente_nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 sm:px-5">{c.medico_nombre || "—"}</td>
                  <td className="px-4 py-3.5 text-slate-600 sm:px-5">{c.motivo || "—"}</td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoCitaClass(c.estado)}`}>
                      {estadoCitaLabel(c.estado)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <Button variant="ghost" onClick={() => onSelectCita(c)}>
                      Ver / editar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
