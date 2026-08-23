# Architecture

## What this is

A rich-text editor: paragraphs and headings, bold, italic, underline and links,
alignment, undo and redo, keyboard shortcuts. There's a panel that shows the live
document model beside the editor, which is the quickest way to see what the rest of
this document is describing.

**The core idea in one paragraph.** The document is a plain JavaScript object. Every
keystroke is intercepted and cancelled before the browser can touch the DOM, a pure
function produces a new document, and React re-renders from it. The DOM is a picture
of the model and never the other way round. Everything below follows from that.

**Where things live.**

```
core/         the document model, selection maths and history. pure, no React, no DOM
dom/          the single module that talks to window.getSelection()
components/   the editor surface, toolbar and inspector
hooks/        useEditor, which wires core into React
```

Roughly two thirds of the code is in `core/`, and all of tests are in it. Section 4
explains why the boundary is drawn there.

---

## 1. Why not just use contenteditable

Type `hello`, select `ell`, press Cmd+B. Depending on the browser and what happened
before, you get one of:

```html
h<b>ell</b>o
h<strong>ell</strong>o
h<span style="font-weight:bold">ell</span>o
```

Now italicise across that boundary and you get nested tags, sibling tags, or empty
leftovers like `<b></b>`. Three problems follow:

- **You can't store it.** Which of those goes in the database?
- **You can't query it.** "Is the selection bold?" has no simple answer when bold is
  three different things.
- **You can't build on it.** Comments, version history and collaboration all need
  something stable to point at.

So the browser doesn't get to decide.

## 2. The loop

```
keypress
  → beforeinput          browser announces what it's about to do
  → preventDefault()     it doesn't get to
  → dispatch(operation)
  → pure function        (doc, selection) → { doc, selection }
  → normalizeBlock
  → React re-renders
  → caret written back   useLayoutEffect, before paint
```

### A keystroke, concretely

Block `b1` holds `Hello ` plain and `world` bold. The caret sits at offset 6, between
them. The user types `X`.

```
1. beforeinput fires: { inputType: 'insertText', data: 'X' }
2. preventDefault()                         nothing has happened to the DOM
3. dispatch({ type: 'insertText', text: 'X' })
4. resolve(block, 6) → { index: 0, inner: 6 }
     offset 6 is a run boundary; it resolves to the END of the earlier run
5. marks = marksAt(block, 6) → {}
     inherit from the character BEFORE the caret, so X is plain, not bold
6. children → [ "Hello X" {}, "world" {bold} ]
7. normalizeBlock: neighbours differ, nothing merges
8. selection → offset 7
9. history: same block, contiguous, <500ms since the last insert → coalesce
10. React re-renders block b1
11. useLayoutEffect: DOM caret is gone, write offset 7 back before paint
```

Steps 4 to 8 are pure and tested. Steps 1, 2 and 11 are the only ones that touch a
browser.

### Four things that only show up once it runs

| | Why |
|---|---|
| `beforeinput` is attached **natively**, not via React's `onBeforeInput` | React's is a synthetic event predating the spec. No deletions, unreliable `inputType`. Nothing typed at all until this changed. |
| **Cmd+Z is a keydown handler** | Preventing every input leaves the browser's own undo stack empty, so `historyUndo` never fires. |
| Caret restore is **`useLayoutEffect`**, with a write guard | Re-rendering destroys the caret; restoring after paint means it visibly jumps each keystroke. Without the guard, writing the caret fires `selectionchange`, which reads it, renders, and writes again. |
| **`white-space: pre-wrap`** is correctness, not styling | HTML collapses runs of spaces, so DOM text would be shorter than model text and every mapped offset wrong. |

---

## 3. The data structure

```ts
type Marks = { bold?: true; italic?: true; underline?: true; link?: string };
type InlineNode = { kind: 'text'; text: string; marks: Marks };

type Block =
  | { id: string; type: 'paragraph'; align?: Align; children: InlineNode[] }
  | { id: string; type: 'heading'; level: 1 | 2 | 3; align?: Align; children: InlineNode[] };

type Doc = { blocks: Block[] };
type Position = { blockId: string; offset: number };
```

### Runs of text, not ranges or a tree

`Hello world` with `world` bold, three ways:

```js
// A. flat text + mark ranges (Quill)
{ text: "Hello world", marks: [{ type: 'bold', start: 6, end: 11 }] }

// B. runs carrying their own marks              ← this codebase
[ { text: "Hello ", marks: {} }, { text: "world", marks: { bold: true } } ]

// C. nested tree (ProseMirror)
{ content: [ { text: 'Hello ' }, { type: 'strong', content: [{ text: 'world' }] } ] }
```

**A** decouples text from formatting, so inserting one character at position 0 means
shifting every range after it. Miss one and bold silently lands on the wrong letters.
Rendering also has to sort boundaries and derive runs on every pass, so you compute B
anyway.

**C** breaks on partial overlap. Bold across 0–5 and italic across 3–8 has no clean
nesting — you'd split the italic in two regardless, so you get the nesting complexity
*and* the splitting.

**B** renders one-to-one, and overlap is free: the overlapping section is a single run
carrying both marks.

The cost is fragmentation, which is what normalization handles.

### Normalization, and why one invariant matters

Every operation ends with `normalizeBlock`: merge adjacent runs with identical marks,
drop empty ones.

```js
[ "Hel"{}, "lo "{}, "world"{b}, ""{b} ]   →   [ "Hello "{}, "world"{b} ]
```

The result is a **canonical form**: any document has exactly one representation. Three
features depend on that, which is why it's the load-bearing decision in the codebase:

1. `deepEqual(a, b)` genuinely means "same document"
2. history uses that comparison to skip recording unchanged states
3. runs can't grow without bound

One special case: if dropping empties would leave nothing, exactly one
`{ text: '', marks: {} }` goes back — never zero runs, and never carrying the deleted
text's marks. Two encodings of "empty" would make equality lie, and history would
start recording steps where nothing happened.

### Positions count characters, not runs

`{ blockId, offset }`. Never a child index. Here's why, in four lines:

```
mid-edit:      [ "Hel" ] [ "lo" ]        caret = runIndex 1, offset 0
normalize:     [ "Hello" ]               ← run 1 no longer exists ✗

mid-edit:      blockText = "Hello"       caret = offset 3
normalize:     blockText = "Hello"       ← unchanged ✓
```

> Normalization changes how the text is *divided* into runs. It never changes the text
> itself. A position measured against the text survives; one measured against the
> division does not.

Which run an offset falls in is derived on demand by `resolve()`.

Slate uses paths and pays for it with `Path.transform` on every operation. Lexical
uses node key plus offset, which is what this does.

Alignment is a **block** attribute rather than a mark, because you can't centre half a
line.

---

## 4. Layers

```
core/            pure. no React, no DOM
  model/         types, text, marks, normalize, serialize, queries, operations
  selection/     position arithmetic
  history/       snapshots and coalescing
dom/             the only module touching window.getSelection()
components/      Editor, Toolbar, Inspector, ui
hooks/           useEditor
```

Dependencies point inward, enforced by `no-restricted-imports` on `src/core/**`
rather than by convention. The DOM adapter sits outside `core/` so "core is pure"
needs no asterisk.

**That boundary is also where testability changes.** All the arithmetic was pulled
into `core/`, leaving `dom/selection.ts` as thin plumbing — so not unit-testing it is
a position, not a gap. 138 tests, all logic; Vitest runs in `environment: 'node'`, so
"no DOM snapshots" is structural rather than a promise.

Operations are values rather than function calls (`{ type: 'insertText', text: 'a' }`),
which is the seam collaborative editing would need. `apply()` is the single entry
point, with `assertNever` in the default case so an unhandled variant won't compile.

Rules for mark boundaries (R4) and history coalescing (R5) live in `DECISIONS.md`.

---

## 5. Out of scope, and how I'd approach it

Scoped out for this exercise rather than overlooked. The architecture was built with
each of these in mind, which is why they'd stay contained.

**IME composition.** Composition mutates the DOM before `beforeinput` can stop it, so
some divergence is unavoidable by design. The approach: suspend the pipeline on
`compositionstart` (without `preventDefault`, since the candidate window needs live
DOM), pause caret restoration while composing, then on `compositionend` re-render from
the model and apply the composed text as a normal `insertText`. Getting it right across real
devices is the interesting part, and the part I'd most like to dig into: Android
keyboards fire composition for ordinary typing, and browsers disagree on event
ordering.

**Rich HTML paste.** Plain text works today. HTML needs `DOMParser` into a detached
document (never `innerHTML`), then one recursive walk, which flattens arbitrary nesting
in a single pass precisely because the model is run-based. Unknown elements unwrapped
rather than dropped so content isn't lost, and hrefs through the same `safeHref` that 
`setLink` uses.


## 6. What I'd change with more time

Block-level memoization is in place but unprofiled, so the claim that toolbar
re-renders don't matter is reasoning rather than measurement. History stores whole
snapshots; since operations are already discrete values, inverse operations would be a
contained change inside `core/history`. `deleteWordBackward` uses a whitespace scan
where real word boundaries need `Intl.Segmenter`. And the link popover dismisses on
scroll rather than repositioning.
