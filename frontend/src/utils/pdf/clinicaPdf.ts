import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Cita } from "../../types";
import { estadoCitaLabel, formatFecha, formatFechaHora } from "../format";
import { drawPatientPhoto, drawPdfFooter, drawProfessionalHeader, imageUrlToJpegDataUrl, PDF_COLORS } from "./helpers";

export interface ClinicaConfig {
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  logo_url?: string | null;
}

const HEADER = PDF_COLORS.brand;

type PacientePdf = Record<string, string | number | null | undefined> & {
  id?: number;
  foto_url?: string | null;
};

export const dibujarMembrete = drawProfessionalHeader;

function fichaPaciente(doc: jsPDF, paciente: PacientePdf, startY: number, fotoDataUrl?: string | null) {
  const tableRight = fotoDataUrl ? 48 : 14;
  autoTable(doc, {
    startY,
    body: [
      ["Nombre", String(paciente.nombre || "—"), "DPI", String(paciente.dpi || "—")],
      ["Teléfono", String(paciente.telefono || "—"), "F. nac.", String(paciente.fecha_nacimiento || "—")]
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: HEADER },
    margin: { right: tableRight }
  });
  if (fotoDataUrl) {
    drawPatientPhoto(doc, fotoDataUrl, 170, startY, 24, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("FOTO", 182, startY + 29, { align: "center" });
  }
  return Math.max((doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY, startY + (fotoDataUrl ? 32 : 0)) + 6;
}

export async function descargarRecetaPdf({
  cfg,
  paciente,
  receta,
  medicoNombre
}: {
  cfg: ClinicaConfig;
  paciente: PacientePdf;
  receta: { fecha: string; medicamentos: string; indicaciones?: string | null };
  medicoNombre?: string;
}) {
  const doc = new jsPDF();
  const fotoPaciente = await imageUrlToJpegDataUrl(paciente.foto_url);
  let y = await drawProfessionalHeader(doc, cfg, "Receta médica", {
    meta: [
      ["Fecha", formatFecha(receta.fecha)],
      ["Médico", medicoNombre || "—"]
    ]
  });
  doc.setFontSize(9);
  doc.text(`Fecha: ${formatFecha(receta.fecha)}`, 14, y);
  if (medicoNombre) doc.text(`Médico: ${medicoNombre}`, 120, y);
  y += 8;
  y = fichaPaciente(doc, paciente, y, fotoPaciente);
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
  drawPdfFooter(doc);
  doc.save(`receta-${paciente.dpi}-${receta.fecha}.pdf`);
}

export async function descargarOrdenLabPdf({
  cfg,
  paciente,
  orden,
  medicoNombre
}: {
  cfg: ClinicaConfig;
  paciente: PacientePdf;
  orden: {
    fecha: string;
    estudios_solicitados: string;
    diagnostico_presuntivo?: string | null;
    notas?: string | null;
  };
  medicoNombre?: string;
}) {
  const doc = new jsPDF();
  const fotoPaciente = await imageUrlToJpegDataUrl(paciente.foto_url);
  let y = await drawProfessionalHeader(doc, cfg, "Orden de laboratorio", {
    meta: [
      ["Fecha", formatFecha(orden.fecha)],
      ["Médico solicitante", medicoNombre || "—"]
    ]
  });
  doc.setFontSize(9);
  doc.text(`Fecha: ${formatFecha(orden.fecha)}`, 14, y);
  if (medicoNombre) doc.text(`Médico solicitante: ${medicoNombre}`, 110, y);
  y += 8;
  y = fichaPaciente(doc, paciente, y, fotoPaciente);
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
  drawPdfFooter(doc);
  doc.save(`orden-lab-${paciente.dpi}-${orden.fecha}.pdf`);
}

function filaCita(cita: Cita) {
  return [
    formatFechaHora(cita.fecha_hora),
    estadoCitaLabel(cita.estado),
    cita.medico_nombre || "—",
    cita.motivo || "—",
    cita.notas || "—"
  ];
}

export async function descargarCitasPacientePdf({
  cfg,
  paciente,
  citas
}: {
  cfg: ClinicaConfig;
  paciente: PacientePdf;
  citas: Cita[];
}) {
  const doc = new jsPDF();
  const fotoPaciente = await imageUrlToJpegDataUrl(paciente.foto_url);
  let y = await drawProfessionalHeader(doc, cfg, "Historial completo de citas", {
    meta: [
      ["Emisión", formatFecha(new Date().toISOString().slice(0, 10))],
      ["Total de citas", citas.length]
    ]
  });
  doc.setFontSize(9);
  doc.text(`Fecha de emisión: ${formatFecha(new Date().toISOString().slice(0, 10))}`, 14, y);
  doc.text(`Total de citas: ${citas.length}`, 145, y);
  y += 8;
  y = fichaPaciente(doc, paciente, y, fotoPaciente);

  autoTable(doc, {
    startY: y,
    head: [["Fecha y hora", "Estado", "Médico", "Motivo", "Notas"]],
    body: citas.map(filaCita),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.2, valign: "top" },
    headStyles: { fillColor: HEADER, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 31 },
      1: { cellWidth: 22 },
      2: { cellWidth: 34 },
      3: { cellWidth: 42 },
      4: { cellWidth: 53 }
    },
    margin: { left: 14, right: 14 }
  });

  drawPdfFooter(doc);
  doc.save(`historial-citas-${paciente.dpi || paciente.id || "paciente"}.pdf`);
}

export async function descargarCitaPacientePdf({
  cfg,
  paciente,
  cita
}: {
  cfg: ClinicaConfig;
  paciente: PacientePdf;
  cita: Cita;
}) {
  const doc = new jsPDF();
  const fotoPaciente = await imageUrlToJpegDataUrl(paciente.foto_url);
  let y = await drawProfessionalHeader(doc, cfg, "Detalle de cita médica", {
    meta: [
      ["Fecha y hora", formatFechaHora(cita.fecha_hora)],
      ["Estado", estadoCitaLabel(cita.estado)]
    ]
  });
  y = fichaPaciente(doc, paciente, y, fotoPaciente);

  autoTable(doc, {
    startY: y,
    body: [
      ["Fecha y hora", formatFechaHora(cita.fecha_hora)],
      ["Estado", estadoCitaLabel(cita.estado)],
      ["Médico", cita.medico_nombre || "—"],
      ["Especialidad", cita.medico_especialidad || "—"],
      ["Motivo", cita.motivo || "—"],
      ["Notas", cita.notas || "—"]
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, valign: "top" },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold", fillColor: [239, 246, 255] },
      1: { cellWidth: 144 }
    },
    margin: { left: 14, right: 14 }
  });

  drawPdfFooter(doc);
  doc.save(`cita-${paciente.dpi || paciente.id || "paciente"}-${cita.id}.pdf`);
}

export { descargarFichaClinicaPdf as descargarHistoriaPdf } from "./fichaClinicaPdf";
