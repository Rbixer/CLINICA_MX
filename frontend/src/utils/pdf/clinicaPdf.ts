import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFecha } from "../format";

export interface ClinicaConfig {
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
}

const HEADER: [number, number, number] = [37, 99, 235];

export function dibujarMembrete(doc: jsPDF, cfg: ClinicaConfig, titulo: string, yStart = 14) {
  doc.setFillColor(...HEADER);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(cfg.nombre || "Clínica Integral", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const linea2 = [cfg.direccion, cfg.telefono, cfg.email].filter(Boolean).join(" · ");
  if (linea2) doc.text(linea2, 14, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(titulo, 14, 24);
  doc.setTextColor(40, 40, 40);
  return yStart + 22;
}

function fichaPaciente(doc: jsPDF, paciente: Record<string, string | null | undefined>, startY: number) {
  autoTable(doc, {
    startY,
    body: [
      ["Nombre", paciente.nombre || "—", "DPI", paciente.dpi || "—"],
      ["Teléfono", paciente.telefono || "—", "F. nac.", paciente.fecha_nacimiento || "—"]
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: HEADER }
  });
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

export function descargarRecetaPdf({
  cfg,
  paciente,
  receta,
  medicoNombre
}: {
  cfg: ClinicaConfig;
  paciente: Record<string, string | null | undefined>;
  receta: { fecha: string; medicamentos: string; indicaciones?: string | null };
  medicoNombre?: string;
}) {
  const doc = new jsPDF();
  let y = dibujarMembrete(doc, cfg, "RECETA MÉDICA");
  doc.setFontSize(9);
  doc.text(`Fecha: ${formatFecha(receta.fecha)}`, 14, y);
  if (medicoNombre) doc.text(`Médico: ${medicoNombre}`, 120, y);
  y += 8;
  y = fichaPaciente(doc, paciente, y);
  doc.setFont("helvetica", "bold");
  doc.text("Medicamentos / indicaciones", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(receta.medicamentos, 180);
  doc.text(lines, 14, y);
  y += lines.length * 5 + 4;
  if (receta.indicaciones) {
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(receta.indicaciones, 180), 14, y);
  }
  doc.save(`receta-${paciente.dpi}-${receta.fecha}.pdf`);
}

export function descargarOrdenLabPdf({
  cfg,
  paciente,
  orden,
  medicoNombre
}: {
  cfg: ClinicaConfig;
  paciente: Record<string, string | null | undefined>;
  orden: {
    fecha: string;
    estudios_solicitados: string;
    diagnostico_presuntivo?: string | null;
    notas?: string | null;
  };
  medicoNombre?: string;
}) {
  const doc = new jsPDF();
  let y = dibujarMembrete(doc, cfg, "ORDEN DE LABORATORIO");
  doc.setFontSize(9);
  doc.text(`Fecha: ${formatFecha(orden.fecha)}`, 14, y);
  if (medicoNombre) doc.text(`Médico solicitante: ${medicoNombre}`, 110, y);
  y += 8;
  y = fichaPaciente(doc, paciente, y);
  if (orden.diagnostico_presuntivo) {
    doc.setFont("helvetica", "bold");
    doc.text("Diagnóstico presuntivo", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const diag = doc.splitTextToSize(orden.diagnostico_presuntivo, 180);
    doc.text(diag, 14, y);
    y += diag.length * 5 + 4;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Estudios solicitados", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const est = doc.splitTextToSize(orden.estudios_solicitados, 180);
  doc.text(est, 14, y);
  y += est.length * 5 + 4;
  if (orden.notas) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(orden.notas, 180), 14, y);
  }
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Documento generado por el sistema de gestión clínica.", 14, 285);
  doc.save(`orden-lab-${paciente.dpi}-${orden.fecha}.pdf`);
}

export { descargarFichaClinicaPdf as descargarHistoriaPdf } from "./fichaClinicaPdf";
