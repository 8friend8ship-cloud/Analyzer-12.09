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

## Advanced Template T1/T2 conditional API gate

- After the base Seed is verified, build Advanced Template 1 with both the GPT Chrome bridge and the Flow Chrome bridge first.
- Promote only T1 outputs that pass structure, scene, copy, asset-link, brand, rights, and platform-format checks.
- Advanced Template 2 combines the selected GPT result with Flow video/motion output and completes voice, captions, expression, lip-sync, transitions, BGM, CTA, and platform aspect ratios.
- Do not call paid external APIs during the default path. Reuse Queens, Seed, templates, Drive assets, local functions, and Chrome bridges first.
- Conditional API execution is allowed only when the user explicitly requests a finished/perfect result or automated QA identifies a missing required capability.
- Before an API call, record API_NEED_REASON, missing capability, estimated calls, cost class, and why existing assets/functions cannot satisfy it.
- Call only the missing capability; do not regenerate the complete result unnecessarily.
- The perfect-result gate checks image quality, scene continuity, voice, captions, expression/lip-sync, transitions, BGM, CTA, brand, platform format, rights, URL readback, and publish readback.
- All checks must pass for PERFECT_RESULT_VERIFIED. Any failure becomes QUALITY_HOLD followed by the smallest repair and same-condition verification.
- Chrome and API outputs are derivative assets linked to the original Seed, with tool/version/cost/result URL/quality score recorded.
