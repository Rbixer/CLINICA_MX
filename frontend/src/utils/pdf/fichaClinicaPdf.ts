import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ClinicaConfig } from "./clinicaPdf";
import { calcularEdad, formatFechaLarga } from "../edad";
import { formatFecha } from "../format";

const AZUL: [number, number, number] = [30, 64, 175];
const GRIS_CLARO: [number, number, number] = [241, 245, 249];
const TEXTO: [number, number, number] = [30, 41, 59];

function texto(val: string | null | undefined) {
  const t = String(val || "").trim();
  return t || "—";
}

function dibujarEncabezadoFormal(doc: jsPDF, cfg: ClinicaConfig, pacienteId: number) {
  const folio = `EXP-${String(pacienteId).padStart(5, "0")}-${new Date().getFullYear()}`;

  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.8);
  doc.line(14, 12, 196, 12);
  doc.setLineWidth(0.3);
  doc.line(14, 13.5, 196, 13.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("DOCUMENTO CLÍNICO CONFIDENCIAL", 105, 18, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...AZUL);
  doc.text(texto(cfg.nombre).toUpperCase(), 105, 26, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXTO);
  const contacto = [cfg.direccion, cfg.telefono ? `Tel. ${cfg.telefono}` : null, cfg.email]
    .filter(Boolean)
    .join("  ·  ");
  if (contacto) doc.text(contacto, 105, 32, { align: "center" });

  doc.setDrawColor(...AZUL);
  doc.setFillColor(...GRIS_CLARO);
  doc.rect(14, 36, 182, 10, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...AZUL);
  doc.text("FICHA CLÍNICA — HISTORIA CLÍNICA INTEGRAL", 105, 42.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Folio: ${folio}`, 14, 52);
  doc.text(`Fecha de emisión: ${formatFechaLarga(new Date().toISOString().slice(0, 10))}`, 120, 52);

  doc.setLineWidth(0.5);
  doc.line(14, 55, 196, 55);

  return 58;
}

function tituloSeccion(doc: jsPDF, titulo: string, y: number) {
  doc.setFillColor(...AZUL);
  doc.rect(14, y, 3, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...AZUL);
  doc.text(titulo.toUpperCase(), 20, y + 4.5);
  return y + 10;
}

function bloqueCampo(doc: jsPDF, label: string, value: string, x: number, y: number, width: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x, y);

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  const lines = doc.splitTextToSize(value, width - 4);
  const h = Math.max(10, lines.length * 4 + 4);
  doc.rect(x, y + 1.5, width, h, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXTO);
  doc.text(lines, x + 2, y + 6);

  return y + h + 5;
}

export function descargarFichaClinicaPdf({
  cfg,
  paciente,
  consultas
}: {
  cfg: ClinicaConfig;
  paciente: Record<string, string | null | undefined> & { id?: number };
  consultas: Array<{
    fecha: string;
    motivo?: string | null;
    diagnostico?: string | null;
    tratamiento?: string | null;
    notas?: string | null;
    medico_nombre?: string;
  }>;
}) {
  const doc = new jsPDF();
  const pid = Number(paciente.id) || 0;
  let y = dibujarEncabezadoFormal(doc, cfg, pid);

  y = tituloSeccion(doc, "I. Datos de identificación del paciente", y);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.5, textColor: TEXTO, lineColor: [203, 213, 225] },
    headStyles: { fillColor: GRIS_CLARO, textColor: AZUL, fontStyle: "bold", fontSize: 7 },
    body: [
      [
        { content: "NOMBRE COMPLETO", styles: { fontStyle: "bold", fillColor: GRIS_CLARO } },
        { content: texto(paciente.nombre), colSpan: 3 }
      ],
      [
        { content: "DPI / CUI", styles: { fontStyle: "bold", fillColor: GRIS_CLARO } },
        texto(paciente.dpi),
        { content: "TELÉFONO", styles: { fontStyle: "bold", fillColor: GRIS_CLARO } },
        texto(paciente.telefono)
      ],
      [
        { content: "CORREO", styles: { fontStyle: "bold", fillColor: GRIS_CLARO } },
        texto(paciente.email),
        { content: "SEXO", styles: { fontStyle: "bold", fillColor: GRIS_CLARO } },
        paciente.sexo === "M" ? "Masculino" : paciente.sexo === "F" ? "Femenino" : "—"
      ],
      [
        { content: "DIRECCIÓN", styles: { fontStyle: "bold", fillColor: GRIS_CLARO } },
        { content: texto(paciente.direccion), colSpan: 3 }
      ],
      [
        { content: "F. NACIMIENTO", styles: { fontStyle: "bold", fillColor: GRIS_CLARO } },
        formatFecha(String(paciente.fecha_nacimiento || "")),
        { content: "EDAD", styles: { fontStyle: "bold", fillColor: GRIS_CLARO } },
        calcularEdad(String(paciente.fecha_nacimiento || ""))
      ]
    ],
    margin: { left: 14, right: 14 }
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  y = tituloSeccion(doc, "II. Antecedentes y alertas médicas", y);
  y = bloqueCampo(doc, "Alergias conocidas", texto(paciente.alergias), 14, y, 182);
  y = bloqueCampo(doc, "Antecedentes y notas generales", texto(paciente.notas), 14, y, 182);

  y = tituloSeccion(doc, "III. Registro de atenciones clínicas", y);

  const ordenadas = [...consultas].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  if (!ordenadas.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Sin consultas registradas en el expediente.", 14, y + 4);
    y += 12;
  } else {
    ordenadas.forEach((c, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(...AZUL);
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...AZUL);
      doc.text(`ATENCIÓN CLÍNICA No. ${ordenadas.length - idx}  —  ${formatFechaLarga(c.fecha)}`, 16, y + 5);
      y += 10;

      y = bloqueCampo(doc, "Motivo de consulta", texto(c.motivo), 14, y, 182);
      y = bloqueCampo(doc, "Examen físico y observaciones", texto(c.notas), 14, y, 182);
      y = bloqueCampo(doc, "Diagnóstico / impresión clínica", texto(c.diagnostico), 14, y, 182);
      y = bloqueCampo(doc, "Plan de tratamiento", texto(c.tratamiento), 14, y, 182);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`Médico tratante: ${texto(c.medico_nombre)}`, 14, y);
      y += 10;
    });
  }

  if (y > 255) {
    doc.addPage();
    y = 20;
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(...AZUL);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const aviso =
    "Este documento forma parte del expediente clínico del paciente. Información confidencial protegida por secreto profesional. Prohibida su divulgación sin autorización.";
  doc.text(doc.splitTextToSize(aviso, 182), 14, y);
  y += 14;

  doc.line(14, y + 12, 90, y + 12);
  doc.line(120, y + 12, 196, y + 12);
  doc.setFontSize(8);
  doc.text("Firma y sello del médico tratante", 52, y + 16, { align: "center" });
  doc.text("Firma del paciente o responsable", 158, y + 16, { align: "center" });

  doc.save(`ficha-clinica-${paciente.dpi || pid}.pdf`);
}

/** @deprecated use descargarFichaClinicaPdf */
export { descargarFichaClinicaPdf as descargarHistoriaPdf };
