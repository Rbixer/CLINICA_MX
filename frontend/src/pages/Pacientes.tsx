import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../api";
import type { Paciente } from "../types";
import { Button, Card, Input, Label, Modal, PageHeader, Select } from "../components/ui";

const emptyForm = {
  nombre: "",
  dpi: "",
  telefono: "",
  email: "",
  direccion: "",
  fechaNacimiento: "",
  sexo: "",
  alergias: "",
  notas: ""
};

export default function Pacientes() {
  const [lista, setLista] = useState<Paciente[]>([]);
  const [q, setQ] = useState("");
  const [sexo, setSexo] = useState("");
  const [conAlergias, setConAlergias] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    try {
      setLista(
        await api.pacientes.list({
          q: q.trim() || undefined,
          sexo: sexo || undefined,
          conAlergias: conAlergias || undefined
        })
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setModal(true);
  }

  function openEdit(p: Paciente) {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      dpi: p.dpi,
      telefono: p.telefono,
      email: p.email || "",
      direccion: p.direccion || "",
      fechaNacimiento: p.fecha_nacimiento || "",
      sexo: p.sexo || "",
      alergias: p.alergias || "",
      notas: p.notas || ""
    });
    setModal(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const body = {
        nombre: form.nombre,
        dpi: form.dpi,
        telefono: form.telefono,
        email: form.email || null,
        direccion: form.direccion || null,
        fechaNacimiento: form.fechaNacimiento || null,
        sexo: form.sexo || null,
        alergias: form.alergias || null,
        notas: form.notas || null
      };
      if (editId) {
        await api.pacientes.update(editId, body);
        toast.success("Paciente actualizado");
      } else {
        await api.pacientes.create(body);
        toast.success("Paciente registrado");
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar este paciente y su historial asociado?")) return;
    try {
      await api.pacientes.remove(id);
      toast.success("Paciente eliminado");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle="Registro, edición, eliminación, fotografía y filtros de pacientes"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo paciente
          </Button>
        }
      />

      <Card className="mb-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, DPI o teléfono…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select className="!w-36" value={sexo} onChange={(e) => setSexo(e.target.value)}>
            <option value="">Sexo: todos</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </Select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={conAlergias} onChange={(e) => setConAlergias(e.target.checked)} />
            Con alergias
          </label>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 w-14"></th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">DPI</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Alergias</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Sin pacientes registrados.
                </td>
              </tr>
            ) : (
              lista.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    {p.foto_url ? (
                      <img src={p.foto_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700">
                        {p.nombre.charAt(0)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3">{p.dpi}</td>
                  <td className="px-4 py-3">{p.telefono}</td>
                  <td className="px-4 py-3 text-slate-500">{p.alergias || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/pacientes/${p.id}`}>
                      <Button variant="ghost" className="!px-2" type="button">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" className="!px-2" onClick={() => openEdit(p)}>
                      Editar
                    </Button>
                    <Button variant="ghost" className="!px-2 text-rose-600" onClick={() => onDelete(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} title={editId ? "Editar paciente" : "Nuevo paciente"} onClose={() => setModal(false)}>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <Label>Nombre completo *</Label>
            <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>DPI *</Label>
              <Input required value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono *</Label>
              <Input required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Sexo</Label>
              <Select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                <option value="">—</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </Select>
            </div>
            <div>
              <Label>Correo</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Fecha de nacimiento</Label>
              <Input
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <div>
            <Label>Alergias</Label>
            <Input value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
          </div>
          <div>
            <Label>Notas</Label>
            <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
