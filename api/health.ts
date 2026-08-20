export default async function handler(_req: any, res: any) {
  const backendConfigured = Boolean(process.env.CONTENT_OS_BACKEND_URL);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    service: 'content-os',
    version: '2026-08-20',
    backendConfigured,
    storageMode: backendConfigured ? 'central-backend-enabled' : 'local-first-backend-pending',
    at: new Date().toISOString(),
  });
}
