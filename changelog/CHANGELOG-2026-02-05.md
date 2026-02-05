# Changelog - February 5, 2026

## TUI Improvements

### Usage Dialog Enhancements

- Display token counts (input/output) in usage limit windows for better visibility
- Add locally-tracked token history to enrich provider usage data
- Support token display across multiple providers (Anthropic, Codex, GitHub Copilot, MiniMax)
- Show compact token numbers (e.g., "114k in · 20k out") alongside usage percentages

### Session UI Fixes

- Fix thinking loader still appearing after cancelling a message
- Fix duplicated border on user messages when sidebar is open
- Adjust content width calculation to account for sidebar visibility

## Features

### Token History Tracking

- Add `TokenHistory` module for persistent token usage tracking
- Store token entries with provider ID, input/output counts, and timestamps
- Implement automatic pruning of entries older than 9 days
- Provide aggregation API for summing tokens within time windows

## Testing

### Usage Format Tests

- Add tests for rendering token counts on limit windows
- Add tests for token display when `resetsAt` is missing
- Verify token suffix is omitted when input/output data is not present

---

**Summary**: This release improves the TUI usage dialog with detailed token count visibility and fixes two UI issues related to the thinking loader and message borders. A new token history tracking system enables accurate local token counting across all supported providers.
