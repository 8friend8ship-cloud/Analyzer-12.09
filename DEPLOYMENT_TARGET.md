# Vercel Deployment Target

- Product: Content OS
- Domain: content-os.com
- Role: canonical customer frontend
- Deployment flow: GitHub representative branch -> Vercel Preview -> E2E verification -> Production -> domain attach
- Production gate: do not attach domain until Preview build, stored-data API, browser runtime, and regression checks pass.
- Billing rule: no new paid service or plan change without owner approval.
