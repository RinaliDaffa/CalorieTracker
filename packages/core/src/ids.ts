const secureRandom = (bytes: Uint8Array): Uint8Array => {
  bytes.set(crypto.getRandomValues(new Uint8Array(bytes.length)));
  return bytes;
};

/**
 * RFC 9562 UUIDv7: 48-bit Unix milliseconds, version 7, variant 10, random tail.
 * Time-ordered ids let records from several devices merge without collisions.
 */
export function uuidv7At(
  ms: number,
  rand: (bytes: Uint8Array) => Uint8Array = secureRandom,
): string {
  const bytes = rand(new Uint8Array(16));
  let time = BigInt(Math.max(0, Math.floor(ms)));
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number(time & 0xffn);
    time >>= 8n;
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function uuidv7(): string {
  return uuidv7At(Date.now());
}
