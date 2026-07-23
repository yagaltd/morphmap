spec: task
name: "morphmap-render"
inherits: project
tags: [commands, render, e2e]
---

## Intent

E2e test the `/morphmap` (render) command. The skill renders `.morphmap/morphmap.mindmap.md` to interactive HTML via `npx markmap-cli`, injects the auto-collapse script, and reports the output path. Verify the render produces valid HTML with markmap elements and the auto-collapse script is injected.

## Decisions

- Render command: `npx markmap-cli .morphmap/morphmap.mindmap.md -o .morphmap/morphmap.mindmap.html --no-open`
- Auto-collapse script from `.morphmap/markmap-collapse.js` injected before `</body>`
- `--branch` flag renders localized map from `.morphmap/<branch>.md`
- Output reported as: "Rendered: .morphmap/morphmap.mindmap.html"

## Boundaries

### Allowed Changes
- `skills/render/SKILL.md` (fix if render logic is incomplete)
- `prompts/morphmap.md` (update if needed)
- `.morphmap/morphmap.mindmap.html` (regenerated output)

### Forbidden
- Do NOT modify the mindmap markdown
- Do NOT modify other skill files
- Do NOT modify agent definitions

## Completion Criteria

Scenario: Render produces valid HTML
  Test:
    Package: morphmap-render
    Filter: html_output
  Given the mindmap markdown exists
  When render runs `npx markmap-cli`
  Then `.morphmap/morphmap.mindmap.html` exists and contains markmap elements

Scenario: Auto-collapse script injected
  Test:
    Package: morphmap-render
    Filter: collapse_script
  Given `.morphmap/markmap-collapse.js` exists
  When render completes
  Then the HTML contains the auto-collapse script before `</body>`

Scenario: Render reports output path
  Test:
    Package: morphmap-render
    Filter: report_path
  Given render completes successfully
  When the report is generated
  Then it reports "Rendered: .morphmap/morphmap.mindmap.html"

Scenario: Branch render works
  Test:
    Package: morphmap-render
    Filter: branch_render
  Given a `--branch` flag is passed
  When render runs
  Then it renders `.morphmap/<branch>.md` to `.morphmap/<branch>.html`

## Out of Scope

- Adding new rendering options beyond --branch
- Modifying markmap-cli behavior
