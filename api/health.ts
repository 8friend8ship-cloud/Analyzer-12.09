export default async function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    service: 'content-os',
    version: '2026-08-20',
    backendConfigured: true,
    backendService: 'COMMON_LIBRARY_COLLECTOR',
    backendMode: process.env.CONTENT_OS_BACKEND_URL ? 'env-override' : 'central-canonical-fallback',
    storageMode: 'local-first-central-mirror-enabled',
    readMode: 'central-search-enabled',
    at: new Date().toISOString(),
  });
}
