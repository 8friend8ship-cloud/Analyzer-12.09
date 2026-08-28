# ContentOS Production Canonical Policy — 2026-08-28

## Production binding
- Vercel project `content-os` remains linked to `8friend8ship-cloud/Analyzer-12.09`.
- `contents-os.com` remains on the existing Vercel project. Do not relink or create a replacement project.
- `Analyzer-12.09` is the production-code canonical repository.
- `8friend8ship-cloud/contents-os-git` is the feature-upstream/reference repository. Useful validated deltas are ported into Analyzer, tested in Preview, then merged.

## Runtime policy
- Reuse the existing `processTaskQueue` physical Apps Script trigger. Do not create duplicate ContentOS stage triggers.
- Runtime stages are logical: Queens → Seed → T1 → T2 → Front QA → learning writeback.
- Drive/Sheets cache and stored backdata are first-choice sources.
- For explicit NEW/RECENT/TREND/STALE external gaps, an already-approved bounded API path may be used as fallback. New OAuth scopes, new paid services, new secrets, public publication, payment, destructive changes, or Vercel relink remain human-gated.
- API fallback failures are degraded/non-blocking when the last-good stored path can continue; never mark fabricated success.

## Deployment completion gate
1. Analyzer CI passes.
2. Analyzer Vercel Preview is READY.
3. Existing `content-os` Production deploys the merged Analyzer main SHA.
4. `/api/intelligence?action=health` reports `canonical_repo=8friend8ship-cloud/Analyzer-12.09` and `deployment_policy=KEEP_EXISTING_VERCEL_BINDING` twice.
5. Central Drive registry/history/workflow map is updated with success/failure evidence and next resume point.
