/**
 * Extrai a duração em segundos de um buffer MP4 (ISO Base Media) lendo o atom mvhd dentro de moov.
 * Funciona com buffer parcial (ex.: início ou fim do arquivo); não usa ffmpeg.
 * Referência: ISO 14496-12 (mvhd: timescale + duration).
 */

function readUInt32BE(buf: Buffer, offset: number): number {
  return buf.readUInt32BE(offset);
}

function readBigUInt64BE(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64BE(offset);
}

/**
 * Encontra o offset (no buffer) do primeiro byte do atom com o tipo dado, varrendo apenas atoms de primeiro nível.
 * Retorna { offset, size } do payload (após os 8 bytes de size+type) ou null.
 */
function findAtom(buf: Buffer, type: string, startOffset: number): { payloadOffset: number; payloadSize: number } | null {
  let pos = startOffset;
  while (pos + 8 <= buf.length) {
    const size = readUInt32BE(buf, pos);
    const typeStr = buf.toString('ascii', pos + 4, pos + 8);
    const atomEnd = size === 0 ? buf.length : pos + size;
    if (size > 0 && atomEnd > buf.length) break;
    if (typeStr === type) {
      const payloadOffset = pos + 8;
      const payloadSize = (size === 0 ? buf.length - pos - 8 : size - 8);
      return { payloadOffset, payloadSize };
    }
    pos = size === 0 ? buf.length : pos + size;
  }
  return null;
}

/**
 * Dentro de um buffer que é o payload de um container (ex.: moov), procura um atom pelo tipo.
 */
function findAtomInPayload(buf: Buffer, payloadStart: number, payloadEnd: number, type: string): { payloadOffset: number; payloadSize: number } | null {
  let pos = payloadStart;
  while (pos + 8 <= payloadEnd && pos + 8 <= buf.length) {
    const size = readUInt32BE(buf, pos);
    const typeStr = buf.toString('ascii', pos + 4, pos + 8);
    const atomEnd = size === 0 ? payloadEnd : pos + size;
    if (size > 0 && atomEnd > buf.length) break;
    if (typeStr === type) {
      const payloadOffset = pos + 8;
      const payloadSize = (size === 0 ? atomEnd - pos - 8 : size - 8);
      return { payloadOffset, payloadSize };
    }
    pos = size === 0 ? payloadEnd : pos + size;
  }
  return null;
}

/**
 * Lê duração em segundos a partir do atom mvhd (payload já extraído).
 * mvhd: version(1), flags(3), creation_time, modification_time, timescale, duration...
 * version 0: creation(4), modification(4), timescale(4) @ 16, duration(4) @ 20.
 * version 1: creation(8), modification(8), timescale(4) @ 28, duration(8) @ 32.
 */
function parseMvhdDuration(buf: Buffer, payloadOffset: number, payloadSize: number): number | null {
  if (payloadSize < 24) return null;
  const version = buf[payloadOffset];
  if (version === 0) {
    const timescale = readUInt32BE(buf, payloadOffset + 16);
    const duration = readUInt32BE(buf, payloadOffset + 20);
    if (timescale === 0) return null;
    return duration / timescale;
  }
  if (version === 1) {
    if (payloadSize < 40) return null;
    const timescale = readUInt32BE(buf, payloadOffset + 28);
    const durationBig = readBigUInt64BE(buf, payloadOffset + 32);
    const duration = Number(durationBig);
    if (timescale === 0 || !Number.isFinite(duration)) return null;
    return duration / timescale;
  }
  return null;
}

/**
 * Extrai a duração em segundos de um buffer que contém (ou começa com) um arquivo MP4.
 * O buffer pode ser só o início ou só o final do arquivo (moov pode estar em qualquer um).
 * Retorna duração em segundos ou null se não for possível obter.
 */
export function getMp4DurationFromBuffer(buf: Buffer): number | null {
  if (buf.length < 16) return null;
  const moov = findAtom(buf, 'moov', 0);
  if (!moov) return null;
  const { payloadOffset, payloadSize } = moov;
  const payloadEnd = payloadOffset + payloadSize;
  const mvhd = findAtomInPayload(buf, payloadOffset, payloadEnd, 'mvhd');
  if (!mvhd) return null;
  const sec = parseMvhdDuration(buf, mvhd.payloadOffset, mvhd.payloadSize);
  if (sec == null || !Number.isFinite(sec) || sec < 0) return null;
  return sec;
}
