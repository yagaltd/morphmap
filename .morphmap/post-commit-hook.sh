#!/bin/bash
# MorphMap pre-commit hook: auto-render mindmap HTML before commit
# Ensures .morphmap/morphmap.mindmap.html is always in sync with .md
# Installed by /morphmap-init

MDFILE=".morphmap/morphmap.mindmap.md"
HTMLFILE=".morphmap/morphmap.mindmap.html"

# Check if .mindmap.md is staged for commit
if git diff --cached --name-only | grep -q "$MDFILE"; then
  echo "→ morphmap: rendering mindmap HTML..."
  if command -v npx &> /dev/null; then
    npx markmap-cli "$MDFILE" -o "$HTMLFILE" --no-open 2>/dev/null
    if [ $? -eq 0 ]; then
      git add -f "$HTMLFILE"
      echo "✓ mindmap HTML rendered and staged"
    else
      echo "⚠ markmap-cli failed — commit anyway, run 'npx markmap-cli' manually"
    fi
  else
    echo "⚠ npx not found — install Node.js for auto-render"
  fi
fi
