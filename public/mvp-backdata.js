(() => {
  const script = document.currentScript;
  const appId = script?.dataset?.appId || 'APP_UNKNOWN';
  const base = String(script?.dataset?.backendBase || new URL(script?.src || location.href).origin).replace(/\/$/, '');
  const sessionKey = `mvp-backdata-probe:${appId}`;

  const badge = document.createElement('div');
  badge.id = 'mvp-backdata-status';
  badge.textContent = 'MVP · BACKDATA CHECKING…';
  Object.assign(badge.style, {
    position: 'fixed',
    right: '10px',
    bottom: '10px',
    zIndex: '2147483647',
    padding: '7px 10px',
    borderRadius: '999px',
    background: 'rgba(15,23,42,.92)',
    color: '#e2e8f0',
    font: '700 11px/1.2 system-ui,sans-serif',
    boxShadow: '0 4px 18px rgba(0,0,0,.3)',
    border: '1px solid rgba(148,163,184,.3)',
    pointerEvents: 'none'
  });

  const mount = () => {
    if (!document.body.contains(badge)) document.body.appendChild(badge);
  };

  const setBadge = (text, ok) => {
    mount();
    badge.textContent = text;
    badge.style.background = ok ? 'rgba(6,78,59,.94)' : 'rgba(127,29,29,.94)';
    window.__MVP_BACKDATA_STATUS__ = { appId, ok, text, at: new Date().toISOString(), base };
  };

  async function sendHeartbeat() {
    if (sessionStorage.getItem(sessionKey)) return 'PASS*';
    const response = await fetch(`${base}/api/backend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        action: 'enqueue',
        asset_type: 'TEXT',
        url: location.href,
        source_page_url: location.href,
        platform: 'VERCEL_MVP',
        title: `${appId} MVP runtime heartbeat`,
        primary_code: 'MVP_RUNTIME',
        keywords: `MVP_RUNTIME,${appId},NO_LOGIN,NO_USER_API_KEY`,
        target_apps: appId,
        use_case: 'MVP_RUNTIME_HEARTBEAT',
        notes: JSON.stringify({ href: location.href, userAgent: navigator.userAgent.slice(0, 160) })
      })
    });
    if (!response.ok) throw new Error(`SEND_HTTP_${response.status}`);
    const body = await response.json().catch(() => null);
    if (body && body.ok === false) throw new Error(body.error || 'SEND_REJECTED');
    sessionStorage.setItem(sessionKey, '1');
    return 'PASS';
  }

  async function readBackdata() {
    const response = await fetch(`${base}/api/backend?asset_type=TEXT&query=${encodeURIComponent(appId)}&limit=3`, {
      method: 'GET',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`READ_HTTP_${response.status}`);
    const body = await response.json();
    if (!body?.ok) throw new Error(body?.error || 'READ_INVALID');
    return Number(body.count || 0);
  }

  async function run() {
    mount();
    try {
      const send = await sendHeartbeat();
      const count = await readBackdata();
      setBadge(`MVP · SEND ${send} · READ PASS(${count}) · NO LOGIN/KEY`, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setBadge(`MVP · BACKDATA FAIL · ${message}`, false);
      console.error('[MVP backdata probe]', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    void run();
  }
})();
