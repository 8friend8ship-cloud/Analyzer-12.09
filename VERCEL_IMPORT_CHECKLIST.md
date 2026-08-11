# Import Checklist

Use this branch as the single Content OS Vercel import target.

1. Import this GitHub repository into Vercel as a new project.
2. Deploy Preview first; do not attach content-os.com yet.
3. Configure only required public deployment identifiers and server-side secrets through Vercel environment settings.
4. Verify stored-data API, login, dashboard, error handling, and two identical regressions.
5. Promote to Production only after all gates pass, then attach content-os.com and verify DNS/SSL.
