# Changelog - February 4, 2026

## Features

### .agent/skills Directory Support

- Add support for `.agent/skills` directory as an alternative to `.arctic/skills`
- Enable skill discovery from both `.arctic/skills` and `.agent/skills` simultaneously
- Include `.agent` as a valid configuration directory alongside `.arctic` and `.opencode`
- Maintain backward compatibility with existing directory structures

## Testing

### Skill Discovery Tests

- Add test for discovering skills from `.agent/skills` directory
- Add test for concurrent skill discovery from both `.arctic/skills` and `.agent/skills`
- Verify skills from multiple directories are properly aggregated

---

**Summary**: This release adds standard support for the `.agent/skills` directory, allowing users to organize their skills using the `.agent` naming convention popular in AI tooling. Skills from both `.arctic` and `.agent` directories can coexist and are discovered automatically.
