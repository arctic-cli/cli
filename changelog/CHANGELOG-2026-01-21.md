# Changelog - January 21, 2026

## Features

### Process management for AI-started background tasks

- Add `run_in_background` parameter to bash tool for long-running processes like dev servers
- New `/processes` command (aliases: `/ps`, `/servers`) to view and manage running processes
- Process manager dialog with keybinds to stop (d) and restart (r) processes
- Footer indicator shows count of running processes with quick access hint
- PTY state synced in real-time via event bus (created, updated, exited, deleted)

### GitHub Copilot model multipliers

- Display premium request multipliers (x0.33, x1, x3, x10) next to model name for Copilot users
- Add comprehensive multiplier table for Claude, GPT, Gemini, and Grok models on Copilot
- Distinguish between free and paid Copilot plans with different model availability
- Handle model ID variations including -thinking suffix and reasoning effort levels

### Ctrl+click to open files in IDE

- Click file paths in tool results (Read, Write, Edit, List) while holding Ctrl/Cmd to open in IDE
- Automatically detects available IDE (VS Code, Cursor, Windsurf, Zed)
- Visual feedback with underline on hover when Ctrl is held

## Bug Fixes

### Transparent theme dialog button text invisible

- Add `selectedListItemText` color to all 8 themes (arctic, cyberpunk, ember, forest, ocean, pastel, sunset, transparent)
- Dialog confirm buttons now have proper text contrast in all themes
- Fix dialog message text color for better readability

## Enhancements

### General UI improvements

- Simplify working status indicator with inline interrupt hint
- Combine reasoning level and Copilot multiplier in single badge
- Make agent name in footer clickable to open agent selector
- Reduce reasoning block left padding for cleaner layout
- Extended reasoning support detection for Copilot models (GPT-5, Gemini-3, Claude Opus variants)

---

**Summary**: This release adds process management for AI-started background tasks (dev servers, watchers), displays GitHub Copilot premium request multipliers in the model badge, enables Ctrl+click to open files in your IDE, and fixes dialog button visibility in the transparent theme.
