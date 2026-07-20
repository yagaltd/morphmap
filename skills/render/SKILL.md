---
name: morphmap-render
description: Render .morphmap/morphmap.mindmap.md to interactive HTML via npx markmap-cli.
user-invocable: true
argument-hint: "[--branch <name>]"
---

# MorphMap Render

Render the mindmap to interactive HTML.

## Phase 1: RENDER

```bash
npx markmap-cli .morphmap/morphmap.mindmap.md -o .morphmap/morphmap.mindmap.html --no-open
```

If --branch given, render only that branch's localized map:
```bash
npx markmap-cli .morphmap/<branch>.md -o .morphmap/<branch>.html --no-open
```

## Phase 2: REPORT

```
Rendered: .morphmap/morphmap.mindmap.html
Open in browser or VS Code with Markmap extension.
```
