# Vercel Connection Checklist

Use this branch as the single Content OS Vercel source target.

1. Reuse the existing Vercel project `content-os`; do not create a new duplicate project.
2. Connect repository `8friend8ship-cloud/Analyzer-12.09` and representative branch `agent/analyzer-security-contract-20260801` to that project.
3. Deploy Preview first. Keep `contents-os.com` serving the current placeholder until Preview passes.
4. Configure only required public deployment identifiers and server-side secrets through Vercel environment settings. Do not place Gemini/YouTube secrets in browser-exposed `VITE_*` variables.
5. Verify login, landing/dashboard rendering, stored-data path, error handling, mobile layout, and two identical regressions.
6. Promote the verified deployment to Production in the same `content-os` project.
7. Verify `https://contents-os.com` returns the full React frontend over HTTPS and no longer returns the placeholder HTML.
