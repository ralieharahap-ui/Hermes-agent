# Hermes Agent

TypeScript project — AI desktop agent with skill-based architecture and JARVIS-style dashboard.

## Commands
- Build: `npm run build`
- Test: `npm test`
- Typecheck: `npm run typecheck`
- Dashboard: `npm run dashboard` (serves at http://localhost:3141)
- Dev: `npm run dev` (auto-reload dashboard)

## Structure
- `src/skills/types/` — shared type definitions
- `src/skills/device-access/` — device access skill (file search, open, copy, move, device info)
- `src/skills/browser-access/` — browser/web scraping skill (fetch, scrape, extract, search)
- `src/skills/computer-use/` — desktop control skill (screenshot, keyboard/mouse, shell, clipboard, process, notification/TTS)
- `src/skills/airtable-access/` — Airtable integration via Personal Access Token (bases, tables, records CRUD)
- `src/core/skill-registry.ts` — skill registration and tool execution
- `src/dashboard/server.ts` — Express API + static file server for dashboard
- `src/utils/format.ts` — formatting utilities
- `public/index.html` — JARVIS-style dashboard UI with voice-to-voice interaction (Web Speech API)

## Conventions
- All skill tools return `ToolResult { success, data?, error? }`
- Extension aliases (excel, word, pdf, etc.) resolve in `utils/format.ts`
- Cross-platform: Windows, macOS, Linux
- Tests use vitest, placed next to source as `*.test.ts`
- Dashboard API: GET /api/skills, POST /api/execute { tool, params }
- Airtable auth uses Personal Access Token only (no OAuth) — set `AIRTABLE_API_KEY` env var or pass `apiKey` param. Create tokens at https://airtable.com/create/tokens
