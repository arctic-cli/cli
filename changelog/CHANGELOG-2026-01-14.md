# Changelog - January 14, 2026

## Bug Fixes

### Usage limits for connection-based providers

- Fix usage limits not displaying for providers with multiple connections
- Add base provider resolution logic for connection IDs
- Update Codex token refresh to support connection-aware auth keys
- Fix usage fetching to check both direct and base provider auth

### Sidebar usage display

- Fix usage provider resolution to use base provider for limits
- Ensure MiniMax usage limits display correctly for all connection types

## TUI Improvements

### Usage dialog redesign

- Add vertical sidebar navigation for providers with fixed width
- Replace horizontal tabs with scrollable sidebar list
- Add click support for provider selection
- Improve keyboard navigation with Tab/Shift+Tab cycling
- Show loading indicator in provider list
- Add color coding for duplicate provider connections

### Visual enhancements

- Add color coding to usage statistics (tokens, costs, limits)
- Improve visual hierarchy with colored text for numbers
- Update usage limit colors based on remaining percentage (green >70%, yellow >40%, red <40%)
- Add provider name colors for duplicate connections with deterministic hashing
- Improve layout with proper flexbox spacing and alignment

### Navigation improvements

- Add separate scroll areas for sidebar and content
- Improve search filtering for provider names
- Auto-select first provider when filtered list changes
- Better provider sorting by usage (highest token usage first)

## Documentation

### Cleanup

- Remove unused test documentation file

---

**Summary**: This release fixes a critical bug where usage limits were not displaying for connection-based providers (like multiple Codex accounts). The usage dialog has been completely redesigned with a sidebar layout, color-coded statistics, and improved navigation for better usability.
