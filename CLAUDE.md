# Hermes Agent

TypeScript project — AI desktop agent with skill-based architecture.

## Commands
- Build: `npm run build`
- Test: `npm test`
- Typecheck: `npm run typecheck`
- Dev: `npm run dev`

## Structure
- `src/skills/types/` — shared type definitions
- `src/skills/device-access/` — device access skill (file search, open, copy, move, device info)
- `src/core/skill-registry.ts` — skill registration and tool execution
- `src/utils/format.ts` — formatting utilities

## Conventions
- All skill tools return `ToolResult { success, data?, error? }`
- Extension aliases (excel, word, pdf, etc.) resolve in `utils/format.ts`
- Cross-platform: Windows, macOS, Linux
- Tests use vitest, placed next to source as `*.test.ts`
