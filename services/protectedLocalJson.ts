export type EntitlementStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'UNKNOWN';

export type Entitlement = {
  userIdHash: string;
  sessionId: string;
  plan: string;
  status: EntitlementStatus;
  expiresAt: number;
  deviceIdHash?: string;
};

export type EntitlementValidator = () => Promise<Entitlement>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(sessionId: string, userIdHash: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(sessionId + ':' + userIdHash), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('analyzer-local-pack-v1'), iterations: 120000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function assertActive(entitlement: Entitlement) {
  if (entitlement.status !== 'ACTIVE' || Date.now() >= entitlement.expiresAt) throw new Error('ENTITLEMENT_REQUIRED');
}

export async function saveProtectedJson<T>(key: string, value: T, validateEntitlement: EntitlementValidator) {
  const entitlement = await validateEntitlement();
  assertActive(entitlement);
  const cryptoKey = await deriveKey(entitlement.sessionId, entitlement.userIdHash);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoder.encode(JSON.stringify(value)));
  localStorage.setItem(key, JSON.stringify({ v: 1, owner: entitlement.userIdHash, expiresAt: entitlement.expiresAt, iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) }));
}

export async function openProtectedJson<T>(key: string, validateEntitlement: EntitlementValidator): Promise<T> {
  const entitlement = await validateEntitlement();
  assertActive(entitlement);
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error('LOCAL_PACK_NOT_FOUND');
  const record = JSON.parse(raw);
  if (record.owner !== entitlement.userIdHash) throw new Error('OWNER_MISMATCH');
  const cryptoKey = await deriveKey(entitlement.sessionId, entitlement.userIdHash);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(record.iv) }, cryptoKey, new Uint8Array(record.data));
  return JSON.parse(decoder.decode(decrypted)) as T;
}

export async function canOpenProtectedJson(validateEntitlement: EntitlementValidator) {
  try {
    const entitlement = await validateEntitlement();
    assertActive(entitlement);
    return true;
  } catch {
    return false;
  }
}
