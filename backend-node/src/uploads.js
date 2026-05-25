const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf"
]);

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf"
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function decodeBase64(dataBase64) {
  const raw = String(dataBase64 || "");
  const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
  return Buffer.from(base64, "base64");
}

function saveBase64File({ subdir, dataBase64, mimeType, nombreArchivo, maxMb = 12 }) {
  const mime = String(mimeType || "image/jpeg").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error("Formato no permitido. Use JPG, PNG, WEBP, GIF o PDF.");
  }
  const buffer = decodeBase64(dataBase64);
  if (!buffer.length) throw new Error("Archivo vacío o inválido.");
  if (buffer.length > maxMb * 1024 * 1024) {
    throw new Error(`El archivo supera ${maxMb} MB.`);
  }
  const ext = EXT_BY_MIME[mime] || path.extname(String(nombreArchivo || "")) || ".bin";
  const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(UPLOAD_ROOT, subdir);
  ensureDir(dir);
  const fullPath = path.join(dir, name);
  fs.writeFileSync(fullPath, buffer);
  const relative = path.join(subdir, name).replace(/\\/g, "/");
  return { relative, mime, size: buffer.length, name: nombreArchivo || name };
}

function publicUrl(relative) {
  return `/uploads/${relative}`;
}

function deleteFile(relative) {
  if (!relative) return;
  const full = path.join(UPLOAD_ROOT, relative);
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

module.exports = {
  UPLOAD_ROOT,
  ALLOWED_MIME,
  ensureDir,
  saveBase64File,
  publicUrl,
  deleteFile
};
