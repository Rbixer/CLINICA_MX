import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api";
import type { ClinicaConfig } from "../types";
import { Button, Card, Input, Label, PageHeader } from "../components/ui";

export default function Configuracion() {
  const [cfg, setCfg] = useState<ClinicaConfig | null>(null);

  useEffect(() => {
    api.config.get().then(setCfg).catch((e) => toast.error(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    try {
      const updated = await api.config.update({
        nombre: cfg.nombre,
        direccion: cfg.direccion,
        telefono: cfg.telefono,
        email: cfg.email
      });
      setCfg(updated);
      toast.success("Datos de la clínica actualizados (membrete PDF)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  if (!cfg) return <p className="text-slate-500">Cargando…</p>;

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Datos que aparecen en recetas, órdenes de laboratorio y documentos PDF"
      />
      <Card>
        <form className="max-w-lg space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>Nombre de la clínica</Label>
            <Input value={cfg.nombre} onChange={(e) => setCfg({ ...cfg, nombre: e.target.value })} />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={cfg.direccion || ""} onChange={(e) => setCfg({ ...cfg, direccion: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Teléfono</Label>
              <Input value={cfg.telefono || ""} onChange={(e) => setCfg({ ...cfg, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Correo</Label>
              <Input type="email" value={cfg.email || ""} onChange={(e) => setCfg({ ...cfg, email: e.target.value })} />
            </div>
          </div>
          <Button type="submit">Guardar configuración</Button>
        </form>
      </Card>
    </div>
  );
}
