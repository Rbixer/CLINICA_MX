import toast from "react-hot-toast";
import { Bell } from "lucide-react";
import type { Notificacion } from "../types";
import { formatFecha, formatHora } from "./format";

let audioCtx: AudioContext | null = null;

/** Desbloquea el audio tras un clic del usuario (requerido por el navegador). */
export function unlockNotificationAudio() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    /* sin soporte de audio */
  }
}

/** Sonido corto tipo alerta de clínica. */
export function playNotificationSound() {
  try {
    unlockNotificationAudio();
    const ctx = audioCtx ?? new AudioContext();
    audioCtx = ctx;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    const t = ctx.currentTime;
    playTone(880, t, 0.12);
    playTone(1174.66, t + 0.14, 0.18);
  } catch {
    /* autoplay bloqueado hasta interacción */
  }
}

export function toastNuevaNotificacion(n: Notificacion, onIr: () => void) {
  toast.custom(
    (t) => (
      <button
        type="button"
        onClick={() => {
          toast.dismiss(t.id);
          onIr();
        }}
        className={`pointer-events-auto flex w-full max-w-sm gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-lg ring-1 ring-black/5 transition ${
          t.visible ? "notif-toast-enter" : "opacity-0"
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
          <Bell className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">Nueva notificación</span>
          <span className="mt-0.5 block text-sm text-slate-700">{n.titulo}</span>
          <span className="block truncate text-xs text-slate-500">{n.detalle}</span>
          {n.fecha_hora ? (
            <span className="mt-1 block text-xs font-medium text-primary-600">
              {formatFecha(n.fecha_hora)} · {formatHora(n.fecha_hora)}
            </span>
          ) : null}
          <span className="mt-1 block text-[10px] text-slate-400">Clic para ver · Campana para todas</span>
        </span>
      </button>
    ),
    {
      id: `notif-${n.id}`,
      duration: 7000,
      position: "top-right"
    }
  );
}
