#!/bin/bash
# MorphMap post-commit hook: auto-render mindmap HTML after commit
# Installed by /morphmap-init

CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | grep 'morphmap.mindmap.md')
if [ -n "$CHANGED" ]; then
  echo "→ morphmap: rendering mindmap HTML..."
  if command -v npx &> /dev/null; then
    npx markmap-cli .morphmap/morphmap.mindmap.md -o .morphmap/morphmap.mindmap.html --no-open 2>/dev/null
    if [ $? -eq 0 ]; then
      git add .morphmap/morphmap.mindmap.html
      git commit --amend --no-edit --no-verify 2>/dev/null && echo "✓ mindmap HTML auto-rendered and amended to commit" || echo "✓ mindmap HTML rendered (amend failed, run git add + commit manually if needed)"
    else
      echo "⚠ markmap-cli failed — run 'npx markmap-cli' manually"
    fi
  else
    echo "⚠ npx not found — install Node.js for auto-render"
  fi
fi
