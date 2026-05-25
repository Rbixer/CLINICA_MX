/** Utilidades de fechas para agenda (formato YYYY-MM-DD). */

export function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return d.toLocaleDateString("en-CA");
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

export function startOfWeek(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("en-CA");
}

export function endOfWeek(iso: string): string {
  return addDays(startOfWeek(iso), 6);
}

export function startOfMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export function endOfMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const last = new Date(y, m, 0);
  return last.toLocaleDateString("en-CA");
}

export function esHoy(iso: string): boolean {
  return iso === new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
}

export function fechaParte(isoHora: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(isoHora)) return isoHora.slice(0, 10);
  const d = new Date(isoHora);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
  }
  return isoHora.slice(0, 10);
}

export function horaParte(isoHora: string): number {
  const d = new Date(isoHora);
  return d.getHours() * 60 + d.getMinutes();
}

export function diasCalendarioMes(ref: string): { fecha: string; enMes: boolean }[] {
  const [y, m] = ref.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startPad = (first.getDay() + 6) % 7;
  const start = new Date(y, m - 1, 1 - startPad);
  const cells: { fecha: string; enMes: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      fecha: d.toLocaleDateString("en-CA"),
      enMes: d.getMonth() === m - 1
    });
  }
  return cells;
}

export function diasSemana(ref: string): string[] {
  const inicio = startOfWeek(ref);
  return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function tituloMes(ref: string): string {
  const d = new Date(`${startOfMonth(ref)}T12:00:00`);
  return d.toLocaleDateString("es-GT", { month: "long", year: "numeric" });
}

export function tituloSemana(ref: string): string {
  const a = new Date(`${startOfWeek(ref)}T12:00:00`);
  const b = new Date(`${endOfWeek(ref)}T12:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-GT", { day: "numeric", month: "short" });
  return `${fmt(a)} – ${fmt(b)}, ${b.getFullYear()}`;
}
