# Working notes

A rich-text editor where the document model is the source of truth and the DOM is
only a projection of it. `ARCHITECTURE.md` explains the design; this file is the
short version for anyone, or anything, about to change code.

## Invariants

Break these and things go wrong in ways that surface three operations later, so
they're worth knowing before touching anything.

1. `src/core/**` is pure. No React imports, no `window`, no `document`. This is
   enforced by `no-restricted-imports` in `eslint.config.js`, not by trust.
2. `src/dom/selection.ts` is the only file allowed to read or write the DOM
   selection. It sits outside `core/` so that rule has no exceptions.
3. Every document change goes through an operation in `core/model/operations/`.
   Nothing else constructs or mutates a `Doc`.
4. Operations return new objects. Never mutate in place.
5. Every operation ends with `normalizeBlock` on the blocks it touched. Adjacent runs
   with equal marks must always be merged and empty runs dropped, so a document has
   exactly one representation. History's change detection depends on this.
6. Positions are `{ blockId, offset }` counting characters. Never store a child
   index; normalization invalidates it.
7. Marks are optional keys only. `{ bold: true }` or `{}`. Never `false`, never
   `undefined` (`JSON.stringify` drops undefined keys and the round-trip test fails
   in a way that looks like a serialization bug).
8. A block always has at least one child. A document always has at least one block.

## Conventions

- TypeScript strict, plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. No `any`.
- Prefer a discriminated union over an object with optional fields, and put
  `assertNever` in the default case of every switch over one.
- Tests are logic tests. Vitest runs in `node`, so there's no DOM to snapshot even by
  accident. Build fixtures with `core/test-builders.ts`.
- Colocated tests: `thing.ts` and `thing.test.ts`.
- Commits are small and scoped: `feat(model):`, `fix(editor):`, `test:`, `docs:`.

## Commands

```
pnpm dev · pnpm test · pnpm test:run · pnpm typecheck · pnpm lint · pnpm build
```

`pnpm build` runs `tsc -b` first, so it fails on type errors the dev server tolerates.
Worth running before you think you're finished.

## Traps

Things that cost time during the build, so they don't cost it again.

- **Use a native `beforeinput` listener, not React's `onBeforeInput`.** React's is a
  synthetic event predating the spec. It doesn't fire for deletions and its
  `inputType` is unreliable. Nothing typed at all until this was fixed.
- **Cmd+Z is a keydown handler.** Because every input is prevented, the browser's undo
  stack stays empty, so it never fires `historyUndo`.
- **Toolbar buttons need `preventDefault()` on `mousedown`,** or clicking one blurs
  the editor and collapses the selection before the click handler runs.
- **Selection restore goes in `useLayoutEffect`,** not `useEffect`, or the caret sits
  in the wrong place for a painted frame on every keystroke.
- **Guard the selection write with a flag.** Writing the caret fires
  `selectionchange`, which reads it, which renders, which writes it. Infinite loop.
- **`selectionchange` must ignore a null result.** Focus moving to the toolbar or link
  popover puts the caret outside the editor, and clearing the model selection there
  leaves those controls with nothing to act on.
- **Don't put anything that isn't content inside the `contenteditable`.** Overlays
  rendered there count as DOM siblings and the block-spacing rule shifts the text.
  Portal them to `document.body`.
- **`white-space: pre-wrap` on `.editor` is load-bearing.** Without it HTML collapses
  runs of spaces, DOM text stops matching model text, and every mapped offset is
  wrong.

## Where to add things

- **A new mark:** one entry in `Marks`, one comparison in `marksEqual`, one line in
  `Inline.tsx`, one entry in the `MARKS` array in `Toolbar.tsx`. Underline took about
  ten minutes.
- **A new block attribute:** on the `Block` union, plus an operation. Check
  `setBlockType` preserves it (it dropped `align` the first time).
- **A new operation:** add the variant to `Operations`, write the function, handle it
  in `apply`. The compiler will tell you if you miss the last step.
- **A new keyboard shortcut:** one entry in `SHORTCUT_MARKS` in `Editor.tsx`.

## Working with AI on this codebase

Cursor and Claude Code are the primary environment here. This file is the context they
get, so keeping it accurate is part of maintaining the repo.

**Where it pays off.** The pure operations in `core/model/operations/` are
well-specified and heavily tested, so a wrong suggestion fails a test rather than
reaching a user. Same for edge-case tests: asking for the cases you haven't thought of
(empty block, offset on a run boundary, backwards selection, deletion spanning three
blocks) is faster than enumerating them yourself. Also good for the tedious parts,
barrel files, type definitions, docs.

**Where it doesn't.** The two decisions in `ARCHITECTURE.md`, the run-based model and
character offsets, are the thing being assessed. Anything load-bearing (data
modelling, security boundaries, the shape of an invariant) is decided by a person and
implemented with the tool, never the other way round.

**One default that's wrong here.** Positions as `{ spanIndex, offset }` is what Slate
does and it reads naturally, but normalization merges and splits runs constantly so an
index is invalidated almost every operation. Use character offsets and derive the run
with `resolve()`. Invariant 6 above covers it, which is the point of writing the
invariants down.

## Reviewing an AI-assisted change

The bar is the same as for any other change. This is the order that catches problems
fastest in this codebase:

1. **Does it break an invariant?** Nine times out of ten a wrong suggestion here shows
   up as a violated invariant rather than a logic error. Check the list above first.
2. **Does the operation end with `normalizeBlock`?** Forgetting it produces a bug that
   surfaces two operations later as a cursor jump, which is miserable to trace.
3. **Are new objects returned, or was something mutated?** There's a test for this on
   `normalizeBlock`; new operations should get one too.
4. **Is there a test for the boundary case, not just the happy path?** Offset 0, offset
   at the end, empty block, selection spanning blocks. Ask for these explicitly.
5. **Can you explain every line without reopening the tool?** If not, it doesn't merge.
   Same bar as copy-pasting from Stack Overflow, just faster and more convincing-
   looking.

For anyone newer to the codebase: prompt with the constraint, not just the goal. "Add
a strikethrough mark, following invariants 5 and 7" produces something reviewable;
"add strikethrough" produces something you have to rewrite.
