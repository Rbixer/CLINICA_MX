import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ClinicaConfig } from "./clinicaPdf";
import { calcularEdad, formatFechaLarga } from "../edad";
import { formatFecha } from "../format";
import { drawPatientPhoto, drawPdfFooter, drawProfessionalHeader, imageUrlToJpegDataUrl, PDF_COLORS } from "./helpers";

const AZUL = PDF_COLORS.brand;
const GRIS_CLARO: [number, number, number] = [241, 245, 249];
const TEXTO: [number, number, number] = [30, 41, 59];

function texto(val: string | number | null | undefined) {
  const t = String(val || "").trim();
  return t || "—";
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

function fotoPlaceholder(doc: jsPDF, label: string, x: number, y: number, width: number, height: number) {
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, width, height, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sin foto ${label.toLowerCase()}`, x + width / 2, y + height / 2, { align: "center" });
}

function dibujarFotoEvolucion(
  doc: jsPDF,
  label: string,
  imageData: string | null,
  x: number,
  y: number,
  width: number,
  height: number
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x, y);

  if (imageData) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, y + 2, width, height);
    doc.addImage(imageData, "JPEG", x + 1, y + 3, width - 2, height - 2);
    return;
  }

  fotoPlaceholder(doc, label, x, y + 2, width, height);
}

export async function descargarFichaClinicaPdf({
  cfg,
  paciente,
  consultas,
  estudios = []
}: {
  cfg: ClinicaConfig;
  paciente: Record<string, string | number | null | undefined> & { id?: number; foto_url?: string | null };
  consultas: Array<{
    fecha: string;
    motivo?: string | null;
    diagnostico?: string | null;
    tratamiento?: string | null;
    notas?: string | null;
    medico_nombre?: string;
  }>;
  estudios?: Array<{
    id: number;
    titulo: string;
    descripcion?: string | null;
    fecha_estudio?: string | null;
    cita_id?: number | null;
    foto_antes_url?: string | null;
    foto_despues_url?: string | null;
  }>;
}) {
  const doc = new jsPDF();
  const pid = Number(paciente.id) || 0;
  const folio = `EXP-${String(pid).padStart(5, "0")}-${new Date().getFullYear()}`;
  let y = await drawProfessionalHeader(doc, cfg, "Ficha clínica", {
    subtitle: "Historia clínica integral del paciente",
    meta: [
      ["Folio", folio],
      ["Emisión", formatFechaLarga(new Date().toISOString().slice(0, 10))]
    ]
  });
  const fotoPaciente = await imageUrlToJpegDataUrl(String(paciente.foto_url || ""));

  y = tituloSeccion(doc, "I. Datos de identificación del paciente", y);
  const datosY = y;

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
    margin: { left: 14, right: fotoPaciente ? 55 : 14 }
  });
  if (fotoPaciente) {
    drawPatientPhoto(doc, fotoPaciente, 158, datosY, 30, 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("FOTOGRAFÍA", 173, datosY + 38, { align: "center" });
  }

  y = Math.max((doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY, datosY + 40) + 6;

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

  const estudiosConEvolucion = estudios.filter((e) => e.foto_antes_url || e.foto_despues_url);
  if (estudiosConEvolucion.length) {
    if (y > 235) {
      doc.addPage();
      y = 20;
    }
    y = tituloSeccion(doc, "IV. Evolución fotográfica desde estudios", y);

    for (const [idx, e] of estudiosConEvolucion.entries()) {
      if (y > 205) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(...AZUL);
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...AZUL);
      doc.text(
        `EVOLUCIÓN DE RECUPERACIÓN No. ${estudiosConEvolucion.length - idx}  —  ${formatFecha(
          e.fecha_estudio || ""
        )}`,
        16,
        y + 5
      );
      y += 10;

      y = bloqueCampo(doc, "Título", texto(e.titulo), 14, y, 182);
      if (e.descripcion) y = bloqueCampo(doc, "Descripción", texto(e.descripcion), 14, y, 182);
      if (e.cita_id) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(`Cita relacionada: #${e.cita_id}`, 14, y);
        y += 7;
      }

      const [fotoAntes, fotoDespues] = await Promise.all([
        imageUrlToJpegDataUrl(e.foto_antes_url || ""),
        imageUrlToJpegDataUrl(e.foto_despues_url || "")
      ]);
      dibujarFotoEvolucion(doc, "Antes", fotoAntes, 14, y, 88, 50);
      dibujarFotoEvolucion(doc, "Después", fotoDespues, 108, y, 88, 50);
      y += 60;
    }
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

  drawPdfFooter(doc);
  doc.save(`ficha-clinica-${paciente.dpi || pid}.pdf`);
}

/** @deprecated use descargarFichaClinicaPdf */
export { descargarFichaClinicaPdf as descargarHistoriaPdf };
