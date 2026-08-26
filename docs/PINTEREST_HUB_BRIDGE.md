# Pinterest Content Hub Bridge

Canonical route: Pinterest ↔ Content Backend / Central Hub ↔ Queens / Seed ↔ apps.

## Endpoints

- `GET /api/pinterest/health`: secret-free bridge self-test.
- `POST /api/pinterest/ingest`: normalize an approved Pinterest URL or public-feed item and forward metadata to the central hub.
- `GET|POST /api/pinterest/pin?pinId=...`: read one Pin owned by the authenticated Pinterest account via API v5, normalize it, and forward it.

## Environment variables

- `PINTEREST_ACCESS_TOKEN`: Pinterest OAuth access token. Required only for API reads.
- `PINTEREST_BRIDGE_SECRET`: optional inbound bridge secret; sent as `x-pinterest-bridge-secret`.
- `CONTENT_OS_PINTEREST_INGEST_URL`: Apps Script or central hub POST endpoint.

## Rights and collection rules

- Use OAuth/API for owned Pins and boards.
- Use public-board RSS or an explicitly approved public feed for references.
- Do not crawl logged-in pages.
- Reference items default to `REFERENCE_ONLY`; the original media remains on Pinterest/Drive.
- The hub stores URLs, IDs, metadata, tags, projects, status, timestamps, and Queens/Seed classification.
- Chrome automation is limited to UI-only tasks that the API cannot perform.

## Activation gate

The bridge remains `METADATA_ONLY` until the Pinterest Developer App has access, its redirect URI exactly matches the configured callback, and a token is installed. Production publishing must remain disabled until one owned Pin read and one owned image/video publish are verified.
