# Rich-text editor core

A rich-text editor where the document model is the single source of truth and the
DOM is only a projection of it.

**Live:** _add deployment URL_

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # 138 unit tests, watch mode
pnpm test:run     # single pass
pnpm typecheck
pnpm lint
pnpm build
```

## What it does

- **Marks.** Bold, italic, underline and link, with boundary rules that match desktop editors.
- **Blocks.** Paragraph, H1 to H3, left/centre/right alignment.
- **Undo/redo.** Restores the document *and* the selection, with typing coalesced into one step.
- **Keyboard.** ⌘B ⌘I ⌘U ⌘Z ⇧⌘Z, plus word and line deletes (⌥⌫, ⌘⌫).
- **Model inspector.** Toggle it on and watch the document change as you type.

## How it works

Every input event is cancelled. Instead of letting the browser edit the DOM, a plain
JavaScript object is updated and the DOM is re-rendered from it, with the caret
written back by hand before paint.

```
keypress → beforeinput → preventDefault() → pure operation → normalize
        → React re-render → caret restored
```

```
src/
  core/         pure. no React, no DOM, enforced by eslint
    model/      types · text · marks · normalize · serialize · queries · operations
    selection/  position arithmetic
    history/    snapshots and coalescing
  dom/          the only module touching window.getSelection()
  components/   Editor · Toolbar · Inspector · ui
  hooks/        useEditor
```

Two decisions everything else follows from:

**A block holds runs of text carrying their own marks**, and every operation ends by
merging adjacent runs with identical marks. That gives exactly one representation per
document, which is what makes equality checks, and therefore history, meaningful.

**A position is `{ blockId, offset }` in characters**, never a child index.
Normalization changes how text is divided into runs but never the text itself, so a
position measured against the text survives it.

Full reasoning in [`ARCHITECTURE.md`](./ARCHITECTURE.md); the rules behind mark
boundaries and history coalescing are in [`DECISIONS.md`](./DECISIONS.md).

## Testing

Vitest runs in `environment: 'node'`, so
that's structural rather than a promise. `dom/selection.ts` is deliberately untested:
every piece of arithmetic it would need was extracted into `text.ts` and
`position.ts`, and the layer boundary is drawn where testability changes.

## Not implemented

IME composition, rich HTML paste (plain text works), grapheme-cluster cursor
movement, soft line breaks, collaboration, and nested containers such as tables.
Each is described with its intended approach in `ARCHITECTURE.md`.
