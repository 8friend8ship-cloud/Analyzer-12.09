export type ContentOsBackendHealth = {
  ok: boolean;
  service?: string;
  backendConfigured?: boolean;
  storageMode?: string;
  at?: string;
};

export async function getContentOsHealth(): Promise<ContentOsBackendHealth> {
  const response = await fetch('/api/health', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Content OS health failed: ${response.status}`);
  return response.json();
}

export async function sendBackendEvent(action: string, payload: unknown): Promise<unknown> {
  const response = await fetch('/api/backend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload, source: 'content-os-front', at: new Date().toISOString() }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Content OS backend failed: ${response.status} ${detail}`.trim());
  }

  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

export async function readBackend(params: Record<string, string>): Promise<unknown> {
  const query = new URLSearchParams(params);
  const response = await fetch(`/api/backend?${query.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Content OS backend read failed: ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}
