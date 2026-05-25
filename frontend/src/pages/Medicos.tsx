import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../api";
import type { Medico } from "../types";
import { Button, Card, Input, Label, Modal, PageHeader } from "../components/ui";

const empty = { nombre: "", especialidad: "", telefono: "", email: "" };

export default function Medicos() {
  const [lista, setLista] = useState<Medico[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    try {
      setLista(await api.medicos.list(false));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm(empty);
    setModal(true);
  }

  function openEdit(m: Medico) {
    setEditId(m.id);
    setForm({
      nombre: m.nombre,
      especialidad: m.especialidad,
      telefono: m.telefono || "",
      email: m.email || ""
    });
    setModal(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const body = { ...form, telefono: form.telefono || null, email: form.email || null };
      if (editId) {
        await api.medicos.update(editId, body);
        toast.success("Médico actualizado");
      } else {
        await api.medicos.create(body);
        toast.success("Médico registrado");
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function deactivate(id: number) {
    if (!confirm("¿Desactivar este médico?")) return;
    try {
      await api.medicos.deactivate(id);
      toast.success("Médico desactivado");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <>
      <PageHeader
        title="Doctores"
        subtitle="Equipo médico y especialidades"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo médico
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((m) => (
          <Card key={m.id} className={m.activo ? "" : "opacity-60"}>
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{m.nombre}</h3>
                <p className="text-sm text-primary-600">{m.especialidad}</p>
              </div>
              {!m.activo ? (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">Inactivo</span>
              ) : null}
            </div>
            <p className="text-sm text-slate-500">{m.telefono || "Sin teléfono"}</p>
            <p className="text-sm text-slate-500">{m.email || "Sin correo"}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => openEdit(m)}>
                Editar
              </Button>
              {m.activo ? (
                <Button variant="ghost" className="text-rose-600" onClick={() => deactivate(m.id)}>
                  Desactivar
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-emerald-700"
                  onClick={async () => {
                    await api.medicos.update(m.id, {
                      nombre: m.nombre,
                      especialidad: m.especialidad,
                      telefono: m.telefono,
                      email: m.email,
                      activo: 1
                    });
                    toast.success("Médico reactivado");
                    load();
                  }}
                >
                  Reactivar
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} title={editId ? "Editar médico" : "Nuevo médico"} onClose={() => setModal(false)}>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <Label>Nombre *</Label>
            <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <Label>Especialidad *</Label>
            <Input
              required
              value={form.especialidad}
              onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
            />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div>
            <Label>Correo</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
