const ADSENSE_SCRIPT_ID = 'google-adsense-script';
const DEFAULT_EXCLUDED_PATHS = ['/login', '/settings', '/privacy', '/terms', '/api'];

function env(name: string): string {
  const value = (import.meta as any)?.env?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function getAdSenseClient(): string {
  return env('VITE_ADSENSE_CLIENT');
}

export function isValidAdSenseClient(client = getAdSenseClient()): boolean {
  return /^ca-pub-\d+$/.test(client);
}

export function getExcludedAdPaths(): string[] {
  const configured = env('VITE_ADSENSE_EXCLUDED_PATHS');
  if (!configured) return DEFAULT_EXCLUDED_PATHS;
  return configured
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAdSensePathAllowed(pathname?: string): boolean {
  if (typeof window === 'undefined' && !pathname) return false;
  const currentPath = pathname ?? window.location.pathname;
  return !getExcludedAdPaths().some((blockedPath) =>
    currentPath === blockedPath || currentPath.startsWith(`${blockedPath}/`),
  );
}

export function installAdSense(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;

  const client = getAdSenseClient();
  if (!isValidAdSenseClient(client) || !isAdSensePathAllowed()) return false;
  if (document.getElementById(ADSENSE_SCRIPT_ID)) return true;

  const script = document.createElement('script');
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(script);
  return true;
}
