/**
 * Extracción mínima de carátulas ID3v2 (frame APIC) desde un archivo de audio.
 * Devuelve un Blob de imagen o null si no hay carátula legible.
 */

function syncSafe(bytes: Uint8Array, off: number): number {
  return (
    ((bytes[off] ?? 0) << 21) |
    ((bytes[off + 1] ?? 0) << 14) |
    ((bytes[off + 2] ?? 0) << 7) |
    (bytes[off + 3] ?? 0)
  );
}

function plainSize(bytes: Uint8Array, off: number): number {
  return (
    ((bytes[off] ?? 0) << 24) |
    ((bytes[off + 1] ?? 0) << 16) |
    ((bytes[off + 2] ?? 0) << 8) |
    (bytes[off + 3] ?? 0)
  );
}

function readLatin1(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i] ?? 0);
  return out;
}

/** Lee la cabecera ID3 (máx 1.5 MB) y extrae la primera imagen APIC/PIC. */
export async function extraerCaratula(file: Blob): Promise<Blob | null> {
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (readLatin1(head, 0, 3) !== "ID3") return null;

    const version = head[3] ?? 0;
    const tagSize = syncSafe(head, 6);
    const total = Math.min(tagSize + 10, 8 * 1024 * 1024);
    const bytes = new Uint8Array(await file.slice(0, total).arrayBuffer());

    let pos = 10;
    // Saltar cabecera extendida si existe
    if (((head[5] ?? 0) & 0x40) !== 0) {
      pos += version === 3 ? plainSize(bytes, pos) + 4 : syncSafe(bytes, pos);
    }

    const idLen = version === 2 ? 3 : 4;
    const headerLen = version === 2 ? 6 : 10;

    while (pos + headerLen <= bytes.length) {
      const id = readLatin1(bytes, pos, pos + idLen);
      if (!/^[A-Z0-9]{3,4}$/.test(id)) break;

      const size =
        version === 2
          ? ((bytes[pos + 3] ?? 0) << 16) | ((bytes[pos + 4] ?? 0) << 8) | (bytes[pos + 5] ?? 0)
          : version === 4
            ? syncSafe(bytes, pos + 4)
            : plainSize(bytes, pos + 4);

      if (size <= 0 || pos + headerLen + size > bytes.length) break;

      if (id === "APIC" || id === "PIC") {
        let p = pos + headerLen;
        p += 1; // encoding
        let mime = "image/jpeg";
        if (id === "PIC") {
          const fmt = readLatin1(bytes, p, p + 3).toUpperCase();
          mime = fmt === "PNG" ? "image/png" : "image/jpeg";
          p += 3;
        } else {
          const start = p;
          while (p < bytes.length && bytes[p] !== 0) p++;
          mime = readLatin1(bytes, start, p) || "image/jpeg";
          p += 1;
        }
        p += 1; // picture type
        // description terminada en 0x00 (latin1) o 0x0000 (unicode)
        const enc = bytes[pos + headerLen] ?? 0;
        if (enc === 1 || enc === 2) {
          while (p + 1 < bytes.length && !(bytes[p] === 0 && bytes[p + 1] === 0)) p += 2;
          p += 2;
        } else {
          while (p < bytes.length && bytes[p] !== 0) p++;
          p += 1;
        }
        const end = pos + headerLen + size;
        if (p < end) {
          return new Blob([bytes.slice(p, end)], {
            type: mime.startsWith("image/") ? mime : "image/jpeg",
          });
        }
      }

      pos += headerLen + size;
    }
  } catch {
    /* archivo sin ID3 legible */
  }
  return null;
}
