# Changelog - January 6, 2026

## TUI Improvements

### Dialog Link Interaction

- Made OAuth URLs in dialogs clickable for easier authentication

### Copy Button Visibility

- Changed copy button default state to hidden (opt-in via settings)

### Usage Limits Display

- Fixed "Failed to load" error when opening new chat with sidebar
- Changed initial usage display to "Waiting for usage..." before first API call
- Added visual warning (red color) when usage remaining falls below 15%

### Text Layout

- Fixed long text overflow issues in AI responses
- Removed unnecessary flex wrapping in user message layout

### Error Display

- Simplified error message presentation with direct text display instead of bordered boxes

## Provider Pricing

### Codex Models

- Fixed pricing lookup for Codex effort-level model variants (low/medium/high/xhigh)
- Added fallback matching for Codex Max models

## Stats Command

### Time Range Options

- Added support for "today" and "yesterday" keywords in --days parameter
- Improved date range filtering logic

## Configuration

### Keybindings

- Changed default permission toggle keybinding from alt+shift+p to <leader> p

## UI Polish

### Loading States

- Improved streaming indicator with randomized text variants
- Removed error toast displays to reduce visual noise

---

**Summary**: This release improves the TUI user experience by making dialog links clickable, fixing usage limits display issues, and adding visual warnings for low usage. It also fixes Codex model pricing lookups and enhances the stats command with natural date range options.
