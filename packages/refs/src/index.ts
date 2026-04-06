export function randomRef() {
  try {
    const bytes = new Uint32Array(2);
    globalThis.crypto.getRandomValues(bytes);
    return bytes.reduce((str, byte) => str + byte.toString(36), "");
  } catch {
    return Math.floor(Math.random() * 0xffffffffffff).toString(36);
  }
}
