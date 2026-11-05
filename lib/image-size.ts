import fs from "fs";
import path from "path";

export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Intrinsic size of a local image under public/images/, read from the file
 * header (PNG or JPEG). Returns null for remote URLs, unknown formats or
 * unreadable files, so callers can fall back to a plain <img>.
 */
export function getLocalImageSize(src: string): ImageSize | null {
  if (!src.startsWith("/images/")) return null;
  const file = path.join(process.cwd(), "public", src);
  if (!file.startsWith(path.join(process.cwd(), "public", "images"))) return null;

  let buf: Buffer;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return null;
  }

  // PNG: width and height are the first two fields of the IHDR chunk.
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: walk the segments to the first start-of-frame marker.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) return null;
      const marker = buf[offset + 1];
      const length = buf.readUInt16BE(offset + 2);
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSof) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }

  return null;
}
