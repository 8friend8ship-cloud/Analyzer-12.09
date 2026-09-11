# ContentOS DEP0169 Runtime Policy

Canonical production domain: https://contents-os.com

Observed production warning: Node.js DEP0169 (`url.parse()` deprecation) on Vercel Node 24.x. Application source search found no direct `url.parse()` or `url.resolve()` usage in project code. Vercel/Node upstream reports show this warning can originate from bundled/transitive runtime code under Node 24.

Prevention rule:
1. Keep production domain and deployment-hostname checks separate.
2. Treat DEP0169 as a runtime/dependency warning, not as a domain mismatch.
3. Pin ContentOS runtime to Node 22.x until the offending bundled/transitive dependency is upgraded and verified under Node 24.
4. Before restoring Node 24, run source+dependency scan, build test, production route smoke test, then inspect Vercel runtime errors.
5. Do not reopen the resolved contents-os.com domain incident unless Vercel alias or HTTP readback fails.

Verification target after deployment: `/`, `/api/pinterest/health`, `/api/intelligence`, `/api/pinterest/pin` return expected status and no new DEP0169 occurrence is produced after the new deployment timestamp.
