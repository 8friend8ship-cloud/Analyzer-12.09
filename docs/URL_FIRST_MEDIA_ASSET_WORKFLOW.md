# URL-First Media Asset Workflow

Status: IMPLEMENTED_AS_POLICY / RUNTIME_PENDING_PINTEREST_APPROVAL

## Scope

This policy applies to every image, video, audio, persona, interior-space asset, Queens source, Seed derivative, template output, video render, and platform publication record.

## Canonical flow

1. Source media enters Queens first.
2. Queens stores an immutable source URL and ownership/rights metadata.
3. Seed creates reusable analyzed or edited derivatives without replacing the source.
4. T1/T2 templates reference asset IDs and URLs; binary media is not embedded in GitHub or spreadsheet cells.
5. Video Bridge consumes the selected Seed/T2 asset URL and emits a new derivative URL.
6. Platform publishers write publication IDs and URLs back to the central data hub.
7. After Pinterest Trial approval, eligible assets are mirrored to Pinterest boards by category and Pinterest Pin/Board IDs are written back.

## Priority routes

- PERSONA_IMAGE: Queens persona source -> Seed persona variants -> T1/T2 -> video bridge -> platform publishers.
- INTERIOR_SPACE: Interior app source photo -> Queens -> editable Seed -> OpenAI/approved editor variants -> interior asset library -> video bridge -> platform publishers.
- GENERAL_MEDIA: Drive or approved external source -> Queens -> Seed qualification -> templates -> publishers.

## Required fields

- ASSET_ID
- SOURCE_ASSET_ID
- PROJECT_ID
- ASSET_TYPE
- SOURCE_URL
- DRIVE_FILE_ID
- PREVIEW_URL
- DERIVATIVE_URL
- RIGHTS_OWNER
- RIGHTS_STATUS
- PERSONA_ID
- SPACE_TYPE
- STYLE_TAGS
- EDIT_ENGINE
- EDIT_PROMPT_VERSION
- QUEENS_STATUS
- SEED_STATUS
- TEMPLATE_ID
- VIDEO_JOB_ID
- PUBLISH_TARGET
- PUBLISH_STATUS
- PLATFORM_POST_ID
- PLATFORM_URL
- PINTEREST_BOARD_ID
- PINTEREST_PIN_ID
- CREATED_AT
- UPDATED_AT
- CONTENT_HASH
- DEDUPE_KEY
- ERROR_CODE
- TRACE_ID

## Guards

- URL_REQUIRED: records without a retrievable source or derivative URL cannot advance.
- RIGHTS_REQUIRED: unknown or disallowed rights cannot enter generation or publication.
- SOURCE_IMMUTABLE: edits always create a derivative record.
- HASH_DEDUPE: identical content is not duplicated.
- ACCOUNT_MATCH: platform account, board/channel owner, and token ACCOUNT_ID must match.
- READBACK_REQUIRED: every publish must return a platform ID/URL and be written back.
- NO_SECRET_IN_DATA: OAuth tokens and secrets never enter Drive sheets, GitHub, prompts, logs, or screenshots.
- API_FIRST: official APIs are primary; Chrome extensions are allowed only for unsupported UI-only steps.

## Pinterest board map

Board selection is driven by category metadata after OAuth approval. Initial logical categories:

- Personas
- Interior / Living Room
- Interior / Kitchen
- Interior / Bathroom
- Interior / Bedroom
- Interior / Commercial
- Video Templates
- Published Campaigns

Do not create or publish to boards before Trial approval and OAuth account verification.

## Completion gates

QUEENS_URL_VERIFIED -> SEED_DERIVATIVE_VERIFIED -> TEMPLATE_LINK_VERIFIED -> VIDEO_BRIDGE_READBACK_VERIFIED -> PLATFORM_PUBLISH_READBACK_VERIFIED -> PINTEREST_BOARD_WRITEBACK_VERIFIED

A workflow is not COMPLETE while any required gate is pending.
