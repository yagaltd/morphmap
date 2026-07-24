---
name: morphmap-render
description: Render .morphmap/morphmap.mindmap.md to interactive HTML via npx markmap-cli with auto-collapse of ✅ branches.
user-invocable: true
argument-hint: "[--branch <name>]"
---

# MorphMap Render

Render the mindmap to interactive HTML. Injects auto-collapse script so ✅ branches start collapsed. Opens in default browser.

## Phase 1: RENDER

```bash
npx markmap-cli .morphmap/morphmap.mindmap.md -o .morphmap/morphmap.mindmap.html --no-open
```

If --branch given, render only that branch's localized map:
```bash
npx markmap-cli .morphmap/<branch>.md -o .morphmap/<branch>.html --no-open
```

## Phase 2: INJECT AUTO-COLLAPSE

Inject `.morphmap/markmap-collapse.js` into the generated HTML before `</body>`:

```bash
python3 -c "
collapse = open('.morphmap/markmap-collapse.js').read()
html = open('.morphmap/morphmap.mindmap.html').read()
html = html.replace('</body>', f'<script>{collapse}</script></body>')
open('.morphmap/morphmap.mindmap.html', 'w').write(html)
print('Auto-collapse injected.')
"
```

For --branch, substitute `.morphmap/morphmap.mindmap.html` with `.morphmap/<branch>.html`.

## Phase 3: OPEN IN BROWSER

```bash
xdg-open .morphmap/morphmap.mindmap.html
```

If --branch:
```bash
xdg-open .morphmap/<branch>.html
```

## Phase 4: REPORT

```
Rendered: .morphmap/morphmap.mindmap.html
Auto-collapse injected for ✅ branches.
Opened in default browser.
```
