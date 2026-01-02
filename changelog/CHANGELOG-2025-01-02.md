# Changelog - January 2, 2025

## Branding & Domain Updates

- Updated all references from `arcticli.com` to `usearctic.sh` across documentation, install scripts, and theme schemas
- Updated README.md with new domain for installation and documentation links

## UI/UX Improvements

### Terminal UI (TUI)

- **Simplified status indicator**: Removed spinner from working/retry status display for cleaner interface
- **Improved Ctrl+C handling**: Fixed interrupt behavior to properly track Ctrl+C presses even when prompt has input
- **Streamlined agent colors**: Removed multi-color agent system, now uses consistent primary theme color for all agents
- **Enhanced prompt component**: Added `onInterrupt` callback prop to track interrupt count (3 presses to exit)
- **Removed redundant UX**: Eliminated "esc to interrupt" message that was duplicative with Ctrl+C

### CLI Run Command

- **Added working indicator**: Shows animated spinner with "Working..." text during busy/retry states
- **Better visual feedback**: Indicator automatically clears when operation completes

## Stats Command Enhancements

- **Model filtering**: Added `--model` flag to filter statistics by model ID (partial match)
- **Provider filtering**: Added `--provider` flag to filter by provider ID
- **Model usage tracking**: New "Most Used Models" section showing:
  - Model usage count
  - Total cost per model
  - Token usage per model
- **Improved cost calculation**: Now uses Pricing module for accurate cost breakdown per model/provider
- **Enhanced display**: Shows filtered provider/model at top of stats output

## Permission System

- **Allow-all mode tracking**: Added `permission_allow_all_mode` state to sync context for per-session tracking
- **Permission event handling**: Added `permission.allowAllModeChanged` event support in TUI sync

## Provider & Pricing

- **Pricing module refactor**: Created `pricing-fix.ts` with improved provider detection logic
- **Better model detection**: Enhanced `detectProvider()` to strip provider prefixes before detection
- **OpenRouter support**: Added fallback detection for OpenRouter models (containing "/")
- **Gemini handling**: Added Gemini model detection

## Session & Prompts

- **Message tracking**: Enhanced message filtering in stats to respect provider/model filters

## Configuration & Auth

- **Config schema updates**: Updated configuration loading and validation
- **Removed Arctic provider reference**: Cleaned up auth login command (removed arcticli.com API key message)

## Dependencies

- **Added @vercel/analytics**: Version 1.6.1 for web analytics support

## Documentation

- **Removed old docs package**: Deleted entire `packages/docs/` directory (moved to web package)
- **Web documentation updates**: Enhanced documentation in `packages/web/content/docs/`:
  - Updated CLI documentation (benchmark, index, sessions)
  - Updated getting-started guide
  - Updated index page and meta.json
  - Updated plugins, snapshots, and TUI documentation
  - Added new troubleshooting.mdx
  - Added new tutorials.mdx

## Web Package

- **Layout improvements**: Updated root layout with new analytics
- **Config updates**: Updated public config.json
- **Theme configuration**: Added public theme.json
- **Install scripts**: Updated install and install.ps1 scripts

---

**Summary**: This release focuses on improving user experience with better visual feedback, enhanced statistics tracking with model/provider filtering, simplified UI elements, and comprehensive branding updates to the new usearctic.sh domain. The stats command now provides detailed model usage insights, and the TUI has been streamlined for a cleaner interface.
