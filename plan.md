# Plan: UI Model Config + Multi-Agent Diagrams

## Goals
- Move AI provider/model/key configuration to UI (no env-only requirement).
- Allow multiple agents (OpenAI/Claude/Gemini/etc.) to generate diagrams in parallel.
- Support a collaboration mode that merges multiple agent outputs into one diagram.

## Current State
- UI model config exists: `components/model-config-dialog.tsx`, `hooks/use-model-config.ts`
- Config stored in localStorage: `lib/storage.ts`
- Client sends headers to `/api/chat`: `components/chat-panel.tsx`
- Server uses env as default fallback: `lib/ai-providers.ts`

## Proposed Changes

### 1) UI-First Model/Key Setup
- On first launch, if no selected model, open Model Config dialog by default.
- Prevent chat submission until a model is selected (provider + model + key).
- Add optional env toggle:
  - `REQUIRE_CLIENT_MODEL_CONFIG=true`: reject server-default usage.
  - Default: keep env fallback for backward compatibility.
- Validation and fallback:
  - Require model validation before adding it to multi-agent runs.
  - If validation fails, block that agent and surface the error inline.

### 2) Multi-Agent Parallel Diagram Generation
- Let user select multiple configured models as agents.
- Send parallel requests to `/api/chat`, each with its own headers.
- Store each agent's:
  - Chat messages
  - XML output
  - Metadata (provider/model/time/usage)
- UI shows:
  - Tabs to switch agent outputs
  - Compare view (side-by-side)
  - "Apply to canvas" to choose one output
- Concurrency controls:
  - Max parallel agents (configurable limit).
  - Queue or debounce to avoid rate limit spikes.

### 3) Collaboration (Merge) Mode
- Step 1: Generate per-agent diagrams (parallel).
- Step 2: Use a "merge model" to combine XML outputs into a unified diagram.
- Optionally summarize each XML first to reduce tokens before merging.
- Merge quality rules:
  - Preserve IDs, avoid collisions, and normalize naming.
  - Deduplicate repeated components where possible.
  - Prefer consistent layout direction and grouping.

## Data & State Design
- Introduce a per-agent state container:
  - `agentId`, `modelId`, `provider`
  - `messages[]`, `xml`, `status`, `usage`
- Keep the main canvas XML separate; allow "apply" from any agent.
- Add an optional "merge" result state.
- Define per-agent history boundaries (regenerate/edit targets the current agent only).

## API Design
- Keep `/api/chat` as-is for single-agent calls.
- Optional: new `/api/multi-chat` to aggregate parallel requests server-side.
- Reuse existing headers for per-agent config (x-ai-provider, x-ai-model, etc.).
- Cancellation:
  - Client-side abort controllers for each agent request.
  - UI reflects partial completion.

## UX Outline
- Multi-agent selector in chat input or settings.
- Output area:
  - Tabs for each agent
  - Compare mode
  - Merge button + merged result preview
- Clear actions:
  - Apply single agent output to main canvas.
  - Clear per-agent history and outputs.
  - Stop in-flight requests.

## Risks / Considerations
- Higher cost and rate limits with multi-agent parallel requests.
- Must preserve SSRF protection when baseUrl is used.
- localStorage storage size for multiple conversations may grow.
- Access control:
  - Access code enforcement must apply to all agents uniformly.
  - Do not leak API keys in error messages.

## Milestones
1) Force UI setup when no model is selected (optional env enforcement).
2) Multi-agent parallel generation with tabs + apply action.
3) Merge mode with selectable merge model.
4) UX polish + performance handling.

## Questions
- Should env fallback be disabled by default?
- Should API keys stay in localStorage only, or add server storage?
- Which model should be the default "merge model"?
- Should compare view be side-by-side XML preview or render-only?
