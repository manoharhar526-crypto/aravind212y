// Sealed backup file (.htbak): AES-GCM encrypted, so the file is unreadable in editors
// and any edited byte makes the GCM tag check fail on import.
const MAGIC = new TextEncoder().encode("HTBAK1");
const SEED = "ht-sealed-backup-v1::7f3c9a2e-41d8-4b6e-9c0f-backup";

let keyPromise: Promise<CryptoKey> | null = null;
const getKey = () =>
  (keyPromise ??= (async () => {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(SEED), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: new TextEncoder().encode("htbak-salt"), iterations: 50_000, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
    );
  })());

export const sealBackup = async (data: unknown): Promise<Blob> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(data));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: MAGIC }, await getKey(), plain));
  return new Blob([MAGIC, iv, cipher], { type: "application/octet-stream" });
};

export const isSealedBackup = (bytes: Uint8Array) =>
  bytes.length > MAGIC.length + 12 && MAGIC.every((b, i) => bytes[i] === b);

export const openBackup = async (bytes: Uint8Array): Promise<any> => {
  if (!isSealedBackup(bytes)) throw new Error("This isn't a backup file from this app");
  const iv = bytes.slice(MAGIC.length, MAGIC.length + 12);
  const cipher = bytes.slice(MAGIC.length + 12);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: MAGIC }, await getKey(), cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error("This backup file was changed or damaged and can't be imported");
  }
};
