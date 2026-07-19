---
type: mindmap
project: MorphEditor
status: in-progress
timestamp: 2026-07-19
tags: [editor, markdown, typora-style, WYSIWYG]
markmap:
  colorFreezeLevel: 2
  maxWidth: 300
resource: docs/format-spec.md
---

# MorphEditor — Typora-style Markdown Editor

## typing-cursor ✅ — scope: character input, delete, cursor movement, IME · budget: $0.80/$1.50 · 8/12 leaves
- ✅ character input → specs/typing/char-input.spec · $0.08 · 1min
- ✅ delete backspace → specs/typing/backspace.spec · $0.06 · 1min
- ✅ delete forward → specs/typing/forward-delete.spec · $0.05 · 1min
- ✅ cursor placement → specs/typing/cursor-place.spec · $0.10 · 2min
- ✅ cursor arrows → specs/typing/arrow-move.spec · $0.08 · 1min
- ✅ word skip Ctrl+Arrow → specs/typing/word-skip.spec · $0.12 · 3min
- ✅ Home/End keys → specs/typing/home-end.spec · $0.08 · 2min
- ✅ Page Up/Down → specs/typing/page-scroll.spec · $0.06 · 1min
- ⬜ triple-click select block
- ⬜ double-click select word
- ⬜ gutter click select line
- ⬜ IME composition

## selection 🔄 — scope: mouse drag, shift+click, select all, cross-block · budget: $0.45/$1.20 · 3/7 leaves
- ✅ mouse drag selection → specs/selection/drag.spec · $0.15 · 4min
- ✅ Shift+Click extend → specs/selection/shift-click.spec · $0.10 · 2min
- ✅ Shift+Arrow extend → specs/selection/shift-arrow.spec · $0.08 · 2min
- ⬜ Select All Ctrl+A
- ⬜ cross-block selection
- ⬜ read-only selection
- ⬜ click outside clears

## inline-styling ⬜ — scope: bold, italic, code, strikethrough, links, emoji · budget: $0/$2.00 · 0/13 leaves
### bold-italic-code ⬜
- ⬜ bold markers → specs/inline/bold.spec
- ⬜ italic markers → specs/inline/italic.spec
- ⬜ bold+italic → specs/inline/bold-italic.spec
- ⬜ inline code → specs/inline/code.spec
### strikethrough-mark-highlight ⬜
- ⬜ strikethrough → specs/inline/strikethrough.spec
- ⬜ mark/highlight → specs/inline/mark.spec
### links-media ⬜ [🟡 RISKY: URL detection regex]
- ⬜ inline link → specs/inline/link.spec
- ⬜ bare URL auto-link → specs/inline/bare-url.spec
- ⬜ inline image → specs/inline/image.spec
- ⬜ emoji shortcode → specs/inline/emoji.spec
### subscript-superscript ⬜
- ⬜ subscript → specs/inline/sub.spec
- ⬜ superscript → specs/inline/sup.spec
- ⬜ escaped markers → specs/inline/escape.spec

## block-formatting ⬜ — scope: headings, lists, tables, code fences, blockquote · budget: $0/$3.00 · 0/14 leaves
### headings ⬜
- ⬜ heading 1-6 → specs/block/headings.spec
- ⬜ YAML frontmatter → specs/block/frontmatter.spec
### lists ⬜
- ⬜ unordered list → specs/block/unordered-list.spec
- ⬜ ordered list → specs/block/ordered-list.spec
- ⬜ task list → specs/block/task-list.spec
### blocks ⬜
- ⬜ blockquote → specs/block/blockquote.spec
- ⬜ code fence → specs/block/code-fence.spec
- ⬜ horizontal rule → specs/block/hr.spec
### advanced ⬜
- ⬜ table → specs/block/table.spec [🟡 RISKY: alignment parsing]
- ⬜ math block → specs/block/math.spec
- ⬜ footnote → specs/block/footnote.spec
- ⬜ table of contents → specs/block/toc.spec

## editor-shell ⬜ — scope: keyboard shortcuts, clipboard, undo/redo, find-replace
### keyboard-shortcuts ⬜
- ⬜ Ctrl+B/I/K shortcuts → specs/shell/shortcuts.spec
- ⬜ Ctrl+1-6 headings → specs/shell/heading-shortcuts.spec
### clipboard ⬜
- ⬜ copy/cut/paste → specs/shell/clipboard.spec
### undo-redo ⬜
- ⬜ undo/redo stack → specs/shell/undo.spec
### find-replace ⬜
- ⬜ find bar → specs/shell/find.spec
- ⬜ replace → specs/shell/replace.spec

## orientation-layout ⬜ — scope: word wrap, focus mode, typewriter, line numbers
- ⬜ top-down default → specs/layout/top-down.spec
- ⬜ bottom-up chat mode → specs/layout/chat-mode.spec
- ⬜ focus mode → specs/layout/focus.spec
- ⬜ typewriter mode → specs/layout/typewriter.spec
- ⬜ line numbers toggle → specs/layout/line-numbers.spec

## theming ⬜ — scope: dark/light/contrast, syntax highlighting, custom accent
- ⬜ dark theme → specs/theme/dark.spec
- ⬜ light theme → specs/theme/light.spec
- ⬜ system follow → specs/theme/system.spec
- ⬜ syntax highlighting → specs/theme/highlight.spec

## autocomplete ⬜ — scope: emoji picker, link autocomplete, slash commands, heading jump
- ⬜ emoji picker → specs/autocomplete/emoji.spec
- ⬜ slash commands → specs/autocomplete/slash.spec
- ⬜ heading jump → specs/autocomplete/heading-jump.spec

## live-preview ⬜ — scope: inline rendering, marker fade, source toggle
- ⬜ inline live render → specs/preview/inline-render.spec
- ⬜ heading live render → specs/preview/heading-render.spec
- ⬜ code fence live → specs/preview/code-fence-render.spec
- ⬜ list auto-continue → specs/preview/list-continue.spec
- ⬜ marker fade → specs/preview/marker-fade.spec
- ⬜ source toggle → specs/preview/source-toggle.spec

## file-operations ⬜ — scope: open, save, auto-save, export HTML/PDF, recent files
- ⬜ open file → specs/file/open.spec
- ⬜ save file → specs/file/save.spec
- ⬜ auto-save → specs/file/autosave.spec
- ⬜ export HTML → specs/file/export-html.spec
- ⬜ drag-drop open → specs/file/drag-drop.spec

## performance ⬜ — scope: virtual scrolling, lazy highlight, incremental render
- ⬜ virtual scrolling → specs/perf/virtual-scroll.spec [🔴 BLOCKING: gates all UI perf]
- ⬜ lazy syntax highlighting → specs/perf/lazy-highlight.spec
- ⬜ incremental re-render → specs/perf/incremental-render.spec
- ⬜ debounced layout → specs/perf/debounce-layout.spec [needs: typing-cursor ✅]

## accessibility ⬜ — scope: screen reader, keyboard nav, focus, zoom, reduced motion
- ⬜ ARIA roles → specs/a11y/aria.spec
- ⬜ keyboard navigation → specs/a11y/keyboard-nav.spec
- ⬜ focus management → specs/a11y/focus.spec
- ⬜ reduced motion → specs/a11y/reduced-motion.spec

## staging ⬜
### deploy-2026-08-01
- ⬜ deploy typing-cursor module
- ⬜ smoke tests [needs: typing-cursor ✅, selection 🔄]
- ⬜ performance audit → specs/staging/perf-audit.spec

## production 🔴 [BLOCKED: staging not started]
### release-v0.1
- 🔴 merge typing-cursor + selection to main
- 🔴 npm publish

## decisions ⬜
- 2026-07-19: project started using MorphMap methodology
- 2026-07-19: block model rework (v4) deferred to separate sub-branch
