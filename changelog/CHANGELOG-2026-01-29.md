# Changelog - January 29, 2026

## TUI Improvements

### Transparent theme backgrounds

- Update all 40+ themes to use transparent backgrounds
- Simplify background color definitions across all theme files
- Remove dark/light mode object structure for background property
- Improve terminal integration with native background colors

### Conditional scrollbar visibility

- Fix scrollbar to only show when content actually overflows
- Change scrollbar visibility from always-on to conditional
- Reduce visual clutter in session view
- Improve clean appearance when scrolling is not needed

### Safer connection deletion

- Change delete all connections keybind from D to Shift+D
- Prevent accidental bulk deletion of connections
- Require explicit shift modifier for destructive action
- Improve user safety in connection management dialog

## Features

### Command aliases support

- Add aliases field to command configuration schema
- Enable multiple names for the same command
- Support alias resolution in command lookup
- Allow users to create shortcuts for frequently used commands
- Add aliases array to command info structure

## Bug Fixes

### Explicit command validation

- Add validation to ensure command exists before execution
- Throw clear error message when command is not found
- Prevent undefined command execution
- Improve error handling in session prompt

## Configuration

### Command schema updates

- Add optional aliases array to command configuration
- Support command.aliases in arctic.json config files
- Enable alias-based command invocation
- Maintain backward compatibility with existing configs

## Testing

### Command system tests

- Add test suite for command functionality
- Add example command aliases fixture
- Test command resolution and alias lookup
- Ensure proper command validation

---

**Summary**: This release enhances the TUI experience with transparent theme backgrounds across all 40+ themes, conditional scrollbar visibility to reduce clutter, and safer connection deletion requiring Shift+D. Also introduces command aliases support for creating shortcuts to frequently used commands, and improves error handling with explicit command validation.
