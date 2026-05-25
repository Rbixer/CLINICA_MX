import jsPDF from "jspdf";

const BRAND: [number, number, number] = [30, 64, 175];
const BRAND_DARK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [203, 213, 225];
const SOFT: [number, number, number] = [239, 246, 255];

type HeaderConfig = {
  nombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  logo_url?: string | null;
};

export async function imageUrlToJpegDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxSide = 700;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => resolve(null);
    img.src = `${url}${url.includes("?") ? "&" : "?"}pdf=${Date.now()}`;
  });
}

function clean(value?: string | null) {
  return String(value || "").trim();
}

export async function drawProfessionalHeader(
  doc: jsPDF,
  cfg: HeaderConfig,
  title: string,
  options?: {
    subtitle?: string;
    meta?: Array<[string, string | number | null | undefined]>;
  }
) {
  const clinicName = clean(cfg.nombre) || "Clínica Integral";
  const logo = await imageUrlToJpegDataUrl(cfg.logo_url);
  const contact = [
    clean(cfg.direccion),
    cfg.telefono ? `Tel. ${cfg.telefono}` : "",
    clean(cfg.email)
  ].filter(Boolean);

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 34, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 34, 210, 17, "F");
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.8);
  doc.line(14, 51, 196, 51);

  doc.setDrawColor(219, 234, 254);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 8, 22, 22, 2, 2, "FD");
  if (logo) {
    doc.addImage(logo, "JPEG", 15.5, 9.5, 19, 19);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BRAND);
    doc.text(clinicName.slice(0, 2).toUpperCase(), 25, 22, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(clinicName.toUpperCase(), 42, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(219, 234, 254);
  const contactLines = contact.length ? doc.splitTextToSize(contact.join("  ·  "), 95) : ["Expediente clínico digital"];
  doc.text(contactLines.slice(0, 2), 42, 21);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(128, 8, 68, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("DOCUMENTO CLÍNICO", 162, 14, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(...BRAND);
  doc.text(doc.splitTextToSize(title.toUpperCase(), 60).slice(0, 2), 162, 20, { align: "center" });

  if (options?.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(options.subtitle, 14, 43);
  }

  const meta = options?.meta?.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "") || [];
  if (meta.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND_DARK);
    const metaText = meta.map(([label, value]) => `${label}: ${value}`).join("     ");
    doc.text(doc.splitTextToSize(metaText, 116).slice(0, 2), 80, 41);
  }

  return 57;
}

export function drawPdfFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.line(14, 282, 196, 282);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Documento generado por el sistema de gestión clínica. Información confidencial.", 14, 287);
    doc.text(`Página ${i} de ${pages}`, 196, 287, { align: "right" });
  }
}

export const PDF_COLORS = {
  brand: BRAND,
  brandDark: BRAND_DARK,
  muted: MUTED,
  border: BORDER,
  soft: SOFT
};

export function drawPatientPhoto(doc: jsPDF, imageData: string | null, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...BORDER);
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, w, h, "FD");

  if (imageData) {
    doc.addImage(imageData, "JPEG", x + 1, y + 1, w - 2, h - 2);
    return;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("SIN FOTO", x + w / 2, y + h / 2, { align: "center" });
}
