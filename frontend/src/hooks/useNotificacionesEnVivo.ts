import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { Notificacion } from "../types";
import { playNotificationSound, toastNuevaNotificacion, unlockNotificationAudio } from "../utils/notificationAlert";

const POLL_MS = 30_000;

export function useNotificacionesEnVivo(onIr: (n: Notificacion) => void) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const conocidasRef = useRef<Set<string> | null>(null);

  const sincronizar = useCallback(
    async (alertarNuevas: boolean) => {
      if (!alertarNuevas) setLoading(true);
      try {
        const { items } = await api.notificaciones();
        const idsActuales = new Set(items.map((i) => i.id));

        if (conocidasRef.current === null) {
          conocidasRef.current = idsActuales;
          setNotificaciones(items);
          return;
        }

        const nuevas = items.filter((i) => !conocidasRef.current!.has(i.id));
        conocidasRef.current = idsActuales;
        setNotificaciones(items);

        if (alertarNuevas && nuevas.length > 0) {
          playNotificationSound();
          for (const n of nuevas) {
            toastNuevaNotificacion(n, () => onIr(n));
          }
        }
      } catch {
        if (conocidasRef.current === null) setNotificaciones([]);
      } finally {
        if (!alertarNuevas) setLoading(false);
      }
    },
    [onIr]
  );

  useEffect(() => {
    const desbloquear = () => unlockNotificationAudio();
    document.addEventListener("click", desbloquear, { once: true });
    document.addEventListener("keydown", desbloquear, { once: true });
    return () => {
      document.removeEventListener("click", desbloquear);
      document.removeEventListener("keydown", desbloquear);
    };
  }, []);

  useEffect(() => {
    void sincronizar(false);
    const interval = setInterval(() => void sincronizar(true), POLL_MS);
    return () => clearInterval(interval);
  }, [sincronizar]);

  const refrescar = useCallback(() => sincronizar(false), [sincronizar]);

  return { notificaciones, loading, refrescar };
}
