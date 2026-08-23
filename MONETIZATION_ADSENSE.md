# Content OS AdSense Monetization v1

## Runtime policy

- AdSense loads only when `VITE_ADSENSE_CLIENT` matches `ca-pub-<digits>`.
- Login, settings, privacy, terms, and API paths are excluded by default.
- Auto Ads is the first rollout mode; manual slots can use `components/AdSlot.tsx` after Google creates slot IDs.
- The build generates `/ads.txt` from the same publisher ID so the frontend and ads.txt cannot drift.
- If the publisher ID is missing, the app still builds and runs normally with ads inactive.

## Vercel environment

Set `VITE_ADSENSE_CLIENT` to the verified AdSense publisher client ID for Production. Optionally override `VITE_ADSENSE_EXCLUDED_PATHS` with a comma-separated list.

## Rollout order

1. Content OS
2. Travel app
3. Interior/estimate app
4. DryWriter
5. Other frontend apps after the same build and route checks

## Validation

- `npm run lint`
- `npm run build`
- verify `/ads.txt`
- verify no AdSense script on excluded paths
- verify one AdSense script on eligible pages
- verify existing app functions are unchanged
