# Changelog - January 7, 2026

## TUI Improvements

### Exit Confirmation

- Added ctrl+c warning message when pressed once: "Press ctrl+c again to exit"
- Warning displays for 3 seconds before disappearing
- Double ctrl+c within 500ms exits the application
- Fixed issue where copying selected text would interfere with exit confirmation

### Keyboard Handling

- Fixed ESC key triggering commands when a dialog is open
- Added defaultPrevented check to prevent command execution during dialogs

### Interrupt Handling

- Fixed double ESC not showing during streaming operations
- Improved interrupt count tracking with immediate state updates
- Fixed interrupt counter reset timing

## Permission System

### Permission Bypass Mode

- Replaced session-based "allow-all mode" with global "permission bypass mode"
- Permission bypass is now persistent across sessions via settings file
- Added command palette option to toggle permission bypass
- Requires confirmation dialog when enabling bypass mode
- Bypass mode skips all permission checks except doom_loop
- Added prominent warning in prompt footer when bypass is enabled

### Keybindings

- Updated permission toggle keybind from "permission_toggle_allow_all" to "permission_bypass"
- Fixed keybind parsing to handle spaces in leader key combinations (e.g., "<leader> p")

### API Changes

- Added GET /permission/bypass endpoint to check bypass status
- Added POST /permission/bypass endpoint to set bypass status
- Removed session-specific permission endpoints
- Updated SDK with new permission bypass API

## Code Cleanup

### Package Scripts

- Removed dummy scripts: random, clean, lint, format, docs, deploy
- Cleaned up package.json to only include essential scripts

## Configuration

### Settings Persistence

- Added global settings.json file for persistent configuration
- Permission bypass state is saved and restored across sessions
- Settings file stored in Arctic state directory

## Testing

### Permission Tests

- Updated permission tests to reflect new bypass model
- Removed allow-all mode specific tests
- Added tests for space-separated leader key parsing

---

**Summary**: This release enhances TUI UX with a ctrl+c exit confirmation warning and fixes keyboard handling issues with ESC in dialogs. The permission system has been refactored from session-based allow-all mode to a global bypass mode with persistent settings and improved safety warnings. Dummy scripts have been removed from package.json for cleaner project maintenance.
