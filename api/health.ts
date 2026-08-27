export default async function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const qstBackendConfigured = Boolean(
    process.env.CONTENT_OS_BACKEND_URL || process.env.CENTRAL_INTELLIGENCE_BACKEND_URL
  );

  return res.status(200).json({
    ok: true,
    service: 'content-os',
    version: '2026-08-26-runtime-qa',
    // Do not collapse LIVE Q/S/T and stored central backdata into one green flag.
    qstBackendConfigured,
    storedBackdataFallbackConfigured: true,
    backendConfigured: qstBackendConfigured,
    backendService: qstBackendConfigured ? 'QST_BACKEND' : 'COMMON_LIBRARY_COLLECTOR',
    backendMode: qstBackendConfigured ? 'live-qst-env' : 'stored-backdata-canonical',
    storageMode: 'local-first-central-mirror-enabled',
    readMode: qstBackendConfigured ? 'qst-plus-stored-fallback' : 'stored-backdata-only',
    completionGate: 'RUNTIME_OUTPUT_X2_AND_LESSON_CHECKED',
    at: new Date().toISOString(),
  });
}
