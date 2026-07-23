spec: task
name: "morphmap-render"
inherits: project
tags: [morphmap, render, markmap]
---

## Intent

Implement the /morphmap command. Renders .morphmap/morphmap.mindmap.md to interactive HTML via npx markmap-cli. Opens in browser.

## Decisions

- Uses markmap-cli via npx (no local install needed)
- Output: .morphmap/morphmap.mindmap.html
- Auto-collapse script injected for ✅ branches
- Opens in default browser

## Boundaries

### Allowed Changes
- Create: skills/render/SKILL.md (if not exists)
- Create: prompts/morphmap-render.md (if not exists)
- Edit: .morphmap/markmap-collapse.js (if needed)

### Forbidden
- Do NOT modify the mindmap markdown format
- Do NOT modify other skills

## Completion Criteria

Scenario: Render produces HTML
  Test:
    Package: morphmap-render
    Filter: html_produced
  Given a valid morphmap.mindmap.md
  When /morphmap is executed
  Then .morphmap/morphmap.mindmap.html is created and opened in browser

Scenario: Auto-collapse works
  Test:
    Package: morphmap-render
    Filter: auto_collapse
  Given the HTML is rendered
  Then ✅ branches are collapsed by default

## Out of Scope

- Custom CSS themes
- Export to PDF/PNG
