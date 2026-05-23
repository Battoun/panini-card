// Bitmap encoding: 992 bits (1 per sticker) → 124 bytes → base64 ~168 chars
// Much more compact than the previous text format — ideal for QR codes
const TOTAL = 992;

export function encodeDoubles(copies: Record<number, number>): string {
  const bytes = new Uint8Array(Math.ceil(TOTAL / 8));
  for (const [id, count] of Object.entries(copies)) {
    if (count >= 2) {
      const i = Number(id) - 1; // sticker IDs start at 1
      bytes[Math.floor(i / 8)] |= 1 << (i % 8);
    }
  }
  // Convert to base64 URL-safe
  const bin = Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
  return encodeURIComponent(btoa(bin));
}

export function decodeDoubles(token: string): Record<number, number> {
  try {
    const bin   = atob(decodeURIComponent(token));
    const bytes = Uint8Array.from(bin.split('').map((c) => c.charCodeAt(0)));
    const result: Record<number, number> = {};
    for (let i = 0; i < TOTAL; i++) {
      if (bytes[Math.floor(i / 8)] & (1 << (i % 8))) {
        result[i + 1] = 1; // sticker ID = i+1, at least 1 double
      }
    }
    return result;
  } catch {
    return {};
  }
}
