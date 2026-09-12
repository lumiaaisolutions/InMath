/**
 * Validación de tipo de archivo por CONTENIDO real (B-16), no por extensión
 * del nombre — el nombre lo controla quien sube, renombrar un archivo a
 * ".pdf" pasaba cualquier whitelist de extensión sin problema. Se usa antes
 * de guardar cualquier upload (comprobantes de pago, materiales, reactivos,
 * fases).
 */
const FTYP = (b: Buffer) => b.length > 8 && b.subarray(4, 8).toString("latin1") === "ftyp";
const OLE2 = (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
const ZIP = (b: Buffer) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));

const TIPOS_OK: Record<string, (b: Buffer) => boolean> = {
  jpg: (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  jpeg: (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  png: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  webp: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  pdf: (b) => b.subarray(0, 4).toString("latin1") === "%PDF",
  mp4: FTYP,
  mov: FTYP,
  webm: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  mp3: (b) => b.subarray(0, 3).toString("latin1") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  // Legado OLE2 — .doc/.xls/.ppt comparten la misma firma de contenedor.
  doc: OLE2, xls: OLE2, ppt: OLE2,
  // OOXML moderno (.docx/.xlsx/.pptx) y .zip — todos son ZIP por dentro.
  docx: ZIP, xlsx: ZIP, pptx: ZIP, zip: ZIP,
};

/** true si el CONTENIDO real de `contenido` coincide con lo que se espera
 *  para la extensión `ext` (sin el punto, minúsculas). Si `ext` no está en
 *  la lista de tipos conocidos, se considera NO válido (fail-closed). */
export function contenidoCoincideConExtension(ext: string, contenido: Buffer): boolean {
  const validador = TIPOS_OK[ext.replace(/^\./, "").toLowerCase()];
  return !!validador && validador(contenido);
}
