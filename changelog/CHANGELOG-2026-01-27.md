# Changelog - January 27, 2026

## Bug Fixes

### Fix multiple connections merging tokens

- Fix OAuth flow to use full provider ID (including connection name) from the start
- Prevent credentials from different connections being incorrectly merged
- Simplify dialog-provider by removing post-auth credential shuffling
- Fix server auth endpoint to detect existing connections before saving
- Ensure auth CLI command properly parses connection keys

**Issue**: When authenticating multiple connections (e.g., `github-copilot` and `github-copilot:indo`), tokens would sometimes get merged or overwritten, causing both connections to use the same account.

**Fix**: The OAuth flow now passes the complete provider ID (with connection suffix) throughout the entire authentication process, rather than authenticating to the base provider and moving credentials afterward.

### Fix loader staying visible after cancellation

- Check session status when determining if loader should show
- Hide loader immediately when session becomes idle or errors
- Properly handle abort/cancel scenarios

**Issue**: The thinking indicator would remain visible after cancelling a request or when errors occurred.

**Fix**: Added session status check to `isPending` logic - now checks if the session is idle before showing the loader.

## Telemetry Improvements

### Enhanced analytics tracking

- Add persistent device ID for accurate DAU tracking
- Implement daily heartbeat to count active users
- Track app startup with command used
- Track session end with duration, message count, tool count, provider, and model
- Track provider authentication events
- Track agent spawns
- Track MCP server connections
- Track errors by type
- Include channel (main/beta) in telemetry context
- Rewrite backend telemetry endpoint with structured per-date storage

## Internal Changes

### GitHub Copilot auth plugin

- Add built-in GitHub Copilot authentication plugin
- Remove dependency on external `opencode-copilot-auth` plugin

### Provider usage fetcher fix

- Fix usage fetcher to properly include provider connections
- Ensure connections with usage fetchers are included when no targets specified

---

**Summary**: Fixed critical bugs where multiple provider connections would incorrectly share authentication tokens and where the loading indicator would persist after cancellation. Also significantly improved telemetry with device tracking, daily heartbeat, and comprehensive event tracking for better product analytics.
