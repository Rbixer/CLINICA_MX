import type { EstadoCita } from "../types";

export function formatFecha(iso: string) {
  if (!iso) return "—";
  const d = iso.includes("T") ? new Date(iso) : new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatHora(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatFechaHora(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatMoneda(monto: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  }).format(monto);
}

export function formatNumero(n: number) {
  return new Intl.NumberFormat("es-GT").format(n);
}

export function fechaHoyInput() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
}

const ESTADO_LABELS: Record<EstadoCita, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  atendida: "Atendida",
  cancelada: "Cancelada",
  no_asistio: "No asistió"
};

const ESTADO_CLASS: Record<EstadoCita, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  confirmada: "bg-blue-50 text-blue-700",
  atendida: "bg-emerald-50 text-emerald-700",
  cancelada: "bg-slate-100 text-slate-600",
  no_asistio: "bg-rose-50 text-rose-700"
};

export function estadoCitaLabel(estado: EstadoCita) {
  return ESTADO_LABELS[estado] ?? estado;
}

export function estadoCitaClass(estado: EstadoCita) {
  return ESTADO_CLASS[estado] ?? "bg-slate-100 text-slate-700";
}
