# Changelog - January 10, 2026

## Configuration Management

### Config Export and Backup

- Added config export command to create ZIP backups of Arctic configuration
- Command accessible via command palette and slash command /config-export
- Exports all config files from global directory (~/.config/arctic/)
- Includes project-specific configs from .arctic/ directories
- Collects arctic.json, arctic.jsonc, config.json, agents, commands, modes, plugins, and dependencies
- Generates README with restore instructions inside ZIP file
- Interactive prompt for custom save location with smart path resolution
- Supports relative paths, absolute paths, and tilde expansion for home directory
- Creates parent directories automatically if they don't exist
- ZIP compression with DEFLATE level 9 for optimal file size
- Default filename includes current date for easy identification
- Toast notifications confirm successful export with file path
- Security: Auth tokens are NOT included in backups for safety

### Config Export API

- Added /config/export server endpoint returning ZIP binary
- Content-Type header set to application/zip
- Content-Disposition header includes timestamped filename
- Integrated with OpenAPI schema for SDK generation
- SDK updated with config.export() method

## TUI Improvements

### Visual Spacing Enhancements

- Added horizontal padding to logo component for better left/right margins
- Added horizontal padding to prompt input area for improved text spacing
- Added vertical padding to prompt footer for better separation
- Added horizontal padding to conversation scrollbox for better readability
- Removed unnecessary left padding from user messages for consistency
- Overall improved visual hierarchy and breathing room throughout TUI

## Dependencies

### New Package Additions

- Added jszip package for ZIP file generation
- Added @types/jszip for TypeScript support

---

**Summary**: This release adds a comprehensive config backup feature allowing users to export all Arctic configuration as ZIP files for safekeeping. The export includes global and project-specific configs with automatic collection of all relevant files and a helpful README. The TUI receives visual polish with improved padding throughout the interface, making the conversation area, inputs, and footer more spacious and easier to read.
