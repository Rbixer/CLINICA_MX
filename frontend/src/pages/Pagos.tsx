import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../api";
import type { Pago, Paciente } from "../types";
import { Button, Card, Input, Label, Modal, PageHeader, Select } from "../components/ui";
import { fechaHoyInput, formatFecha, formatMoneda } from "../utils/format";

export default function Pagos() {
  const [lista, setLista] = useState<Pago[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    pacienteId: "",
    concepto: "",
    monto: "",
    fecha: fechaHoyInput(),
    metodoPago: "efectivo",
    referencia: "",
    notas: ""
  });

  async function load() {
    const [p, pagos] = await Promise.all([api.pacientes.list(), api.pagos.list()]);
    setPacientes(p);
    setLista(pagos);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, []);

  const total = lista.reduce((s, x) => s + x.monto, 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.pagos.create({
        pacienteId: form.pacienteId ? Number(form.pacienteId) : null,
        concepto: form.concepto,
        monto: Number(form.monto),
        fecha: form.fecha,
        metodoPago: form.metodoPago,
        referencia: form.referencia,
        notas: form.notas
      });
      toast.success("Pago registrado");
      setModal(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Pagos"
        subtitle={`Historial financiero · Total registrado: ${formatMoneda(total)}`}
        action={
          <Button onClick={() => setModal(true)}>
            <Plus className="h-4 w-4" /> Nuevo pago
          </Button>
        }
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Paciente</th>
              <th className="px-4 py-3 text-left">Concepto</th>
              <th className="px-4 py-3 text-left">Monto</th>
              <th className="px-4 py-3 text-left">Método</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-b border-slate-50">
                <td className="px-4 py-3">{formatFecha(p.fecha)}</td>
                <td className="px-4 py-3">
                  {p.paciente_id ? (
                    <Link to={`/pacientes/${p.paciente_id}`} className="text-primary-600 hover:underline">
                      {p.paciente_nombre || `#${p.paciente_id}`}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{p.concepto}</td>
                <td className="px-4 py-3 font-semibold">{formatMoneda(p.monto)}</td>
                <td className="px-4 py-3">{p.metodo_pago || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    className="text-rose-600"
                    onClick={async () => {
                      if (!confirm("¿Eliminar pago?")) return;
                      await api.pagos.remove(p.id);
                      load();
                    }}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} title="Registrar pago" onClose={() => setModal(false)}>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <Label>Paciente</Label>
            <Select value={form.pacienteId} onChange={(e) => setForm({ ...form, pacienteId: e.target.value })}>
              <option value="">General / sin paciente</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Concepto *</Label>
            <Input required value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto *</Label>
              <Input type="number" step="0.01" required value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Método de pago</Label>
            <Select value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </Select>
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
