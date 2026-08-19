# Vercel Deployment Target

- Product: Content OS
- Canonical domain: contents-os.com
- Existing Vercel project: content-os
- Role: canonical customer frontend
- Representative source: branch `agent/analyzer-security-contract-20260801`
- Deployment flow: reuse existing Vercel `content-os` project -> GitHub representative branch -> Vercel Preview -> E2E verification -> Production -> verify existing domain mapping
- Production gate: do not replace the current production placeholder until Preview build, stored-data API, browser runtime, and regression checks pass.
- Duplicate-control rule: do not create another Vercel Content OS project when the existing `content-os` project can be reused.
- Billing rule: no new paid service or plan change without owner approval.
