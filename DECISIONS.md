# Decisions

## What this is

A rich-text editor built around one idea: the document lives in a plain JavaScript
object, and the DOM is only a picture of it.

Normally a `contenteditable` decides for itself what markup to produce, and you find
out afterwards. Here every keystroke is intercepted and cancelled before the browser
can act, a pure function produces a new document, and React re-renders from that. The
caret is then put back by hand. Nothing ever reads the DOM to find out what the
document says.

The document itself is a flat list of blocks, each holding runs of text that carry
their own formatting:

```ts
{
  blocks: [
    { id: 'b1', type: 'paragraph', children: [
        { kind: 'text', text: 'Hello ', marks: {} },
        { kind: 'text', text: 'world',  marks: { bold: true } },
    ]},
  ]
}
```

A cursor position is `{ blockId, offset }`, where the offset counts characters into
that block.

That's the whole model. Blocks, runs, marks, and a position that points at a character.

## The one rule everything protects

Every operation finishes by merging adjacent runs that share the same marks and
throwing away empty ones. So the two runs above would stay separate (different
marks), but two plain runs sitting next to each other would become one.

The point of that is subtle and worth stating plainly: it means a given document has
exactly **one** possible shape in memory. Which means comparing two documents with
`deepEqual` genuinely tells you whether they're the same. Which is how history decides
whether anything actually changed, and therefore why undo never records a step where
nothing happened.

So when a rule below looks fussy, it's usually protecting that one property.

## How to read this

The brief asks for the rules behind **R4 (mark boundaries)** and **R5 (history
coalescing)**, so those two are covered properly. R1, R2, R3 and R6 are summarised for
context. The four rules that are easier to show than describe have diagrams at the
end.

---

## R1 · Document model

The model has to survive a JSON round trip unchanged, and it has to have
one representation per document.

- Everything is plain JSON. No classes, no `Map`, no `Set`, so `toJSON` is close to
  the identity function.
- Marks are optional keys typed as the literal `true` rather than `boolean`, so "not
  bold" has only one possible encoding. [Closer look](#1-marks-are-true-not-boolean).
- Block ids are generated once and never regenerated, because positions point at them.
- The serialized form carries a version, and `fromJSON` refuses an unknown one rather
  than guessing at it.
- `fromJSON` normalizes on the way in, because data coming back from storage is
  untrusted even when we wrote it ourselves.
- The round-trip test goes through a real `stringify` and `parse`, not an object
  clone. A clone would pass even if a mark key held `undefined`, which is the exact
  failure it exists to catch.

## R2 · Model is the source of truth

Information only flows outward. The DOM is a picture of the model and never
tells us anything.

- Every `beforeinput` is cancelled, whether we handle that input type or not. If one
  leaked through, the browser would edit the DOM directly and every offset afterwards
  would be silently wrong.
- Only code in `core/model/operations/` builds or changes a `Doc`.
- `core/` imports no React and touches no DOM. That's enforced by
  `no-restricted-imports` in the ESLint config, not by everyone remembering.
- `beforeinput` is attached with `addEventListener`, not React's `onBeforeInput`.
  React's version predates the spec, doesn't fire for deletions, and has an unreliable
  `inputType`. Nothing typed at all until I switched to the native listener.

## R3 · Selection mapping

Two coordinate systems. The browser says *(this text node, this many
characters in)*; we say *(this block, this many characters in)*. These rules are about
converting between them without either drifting.

- A position is `{ blockId, offset }` counting characters, never an index into the
  children array. It's the most consequential decision in the file.
  [Closer look](#2-character-offsets-rather-than-run-indices).
- Offsets are relative to the block, so editing one paragraph doesn't shift every
  position after it.
- An offset landing exactly between two runs is ambiguous, so `resolve()` always picks
  the earlier one. Deciding it in a single place means callers can't disagree.
- Anchor and focus stay in the order the browser reports them, and are sorted only
  when an operation needs them, because drag direction is real information.
- Positions are clamped when read, and one pointing at a deleted block returns `null`
  rather than a guess.
- The caret is restored in `useLayoutEffect` so it lands before paint, only when the
  DOM actually disagrees, and only while the editor holds focus. Each of those three
  conditions fixes a different bug.
- `selectionchange` ignores a null result, so focus moving to the toolbar doesn't wipe
  the selection those buttons need to act on.

## R4 · Marks and boundaries

The first rule here is the one the brief asks about.

- **Toggling a mark over a partly marked range marks all of it.** It only unmarks when
  every character already carries the mark. [Closer look](#3-the-partial-mark-rule).
- The toolbar calls the same `rangeHasMark` that the toggle uses, so a button can
  never show "on" while clicking it would apply.
- **Toggling with nothing selected queues the mark instead.** There's no text to
  change, but the intent is clear: the next character typed should be bold. It's
  applied on the next insert and dropped as soon as the cursor moves.
- Queued marks never enter the document. They're input state, and storing them would
  let an empty block carry formatting, which would give it two possible
  representations.
- **Typing at a boundary inherits from the character before the caret.** At offset 0
  there's nothing before it, so it takes the character after instead.
- **Link is set and unset rather than toggled**, because it carries a value. Applying
  a link across an existing one replaces the href rather than nesting.
- Two adjacent links pointing at different places never merge, because `marksEqual`
  compares values rather than just checking a key exists.
- Hrefs are sanitised inside `setLink` rather than in the popover, so `javascript:`
  and `data:` URLs can't reach the document no matter what calls it.

## R5 · Undo and redo

History stores snapshots of `{ doc, selection }` rather than inverse operations. That's
the simpler of the two and obviously correct at this size. It costs memory in
proportion to document size rather than change size, which would matter at scale, and
since operations are already discrete serializable values, switching later would stay
inside `core/history`.

Consecutive typing collapses into a single undo step, as long as it is:

- in the same block
- contiguous with the previous insert
- carrying the same marks
- within 500ms of it

Hold a key down, press undo once, and the whole run disappears rather than one letter.
[What ends a run](#4-what-ends-an-undo-run).

The rest of the rules:

- Nothing is pushed when the document hasn't actually changed. That check is an
  equality comparison, and it's only trustworthy because of the normalization
  invariant.
- A selection-only move updates the existing top entry instead of adding a new one, so
  moving the caret around doesn't fill the stack with noise.
- Undo restores the document and the selection together, and clears any queued marks.
- The stack caps at 100 entries, and the initial document counts as one so undo can
  reach the very beginning.
- `record` takes the current time as a parameter rather than calling `Date.now()`
  itself, which keeps it pure and lets the coalescing tests pass timestamps instead of
  mocking timers.
- Cmd+Z is caught as a keydown, not as a `historyUndo` input event. Preventing every
  input leaves the browser's own undo stack empty, so that event never fires.

## R6 · Toolbar

*Summary.* The toolbar should never lie about what a click will do.

- A mark button is active only when every character in the selection carries that
  mark, matching the toggle rule exactly.
- With just a caret it shows queued marks if there are any, otherwise the marks the
  next character would inherit, so it always predicts what typing would produce.
- Buttons call `preventDefault()` on `mousedown`. Without it, clicking one blurs the
  editor and collapses the selection before the handler runs.
- Marks and alignments come from config arrays rather than hand-written JSX, so adding
  one is a single entry.
- Disabled is a distinct visual treatment rather than reduced opacity. The link button
  started as an emoji, which ignores `color`, so it stayed bright while every other
  button dimmed.
- The link popover floats against the selection rather than the toolbar, the way
  Lexical does it. It's portalled to `document.body` with a highlight, because the
  browser stops painting the selection once focus moves into the URL field.

---

# Closer look

### 1. Marks are `true`, not `boolean`

```ts
type Marks = { bold?: true };   // { bold: true } or {}
// not { bold?: boolean }       // would also allow { bold: false }
```

If `{ bold: false }` were legal it would mean the same thing as `{}`, so a document
would have two possible shapes and equality would stop meaning anything. Typing the
field as the literal `true` makes the bad state impossible to write rather than merely
discouraged.

`exactOptionalPropertyTypes` also rules out `{ bold: undefined }`, which matters
because `JSON.stringify` drops undefined keys. Without it, removing a mark by spreading
`{ ...marks, bold: undefined }` would change the object's shape across a round trip.

### 2. Character offsets rather than run indices

```
mid-edit:    [ "Hel" ] [ "lo" ]     caret = runIndex 1, offset 0
normalize:   [ "Hello" ]            run 1 no longer exists

mid-edit:    blockText = "Hello"    caret = offset 3
normalize:   blockText = "Hello"    unchanged
```

Normalization changes how the text is *divided* into runs. It never changes the text
itself. So a position measured against the text survives it and a position measured
against the division doesn't. Which run an offset falls in gets derived on demand by
`resolve()`.

Slate uses paths and pays for it with `Path.transform` on every operation. Lexical
uses a node key plus an offset, which is essentially this.

### 3. The partial-mark rule

```
[He]llo      "He" bold, "llo" plain, all five characters selected
press B  →   [Hello]     everything bold
press B  →   [Hello]     everything plain
```

Only unbold when the whole range is already bold. Google Docs and Word both behave
this way, so users don't have to learn anything.

### 4. What ends an undo run

Typing keeps merging into one step for as long as it stays the same kind of edit. A
run ends on a mark toggle, a block split, switching between inserting and deleting, a
selection jump, or an undo.

---

## Underneath

A few choices that sit below the requirements.

Text is stored as runs each carrying their own marks, rather than flat text plus a
list of mark ranges, or a nested tree. Ranges have to be shifted on every insertion; a
tree can't express partially overlapping marks without splitting anyway.

An empty block is always exactly one empty run with empty marks. Never zero runs, and
never carrying the marks of whatever was just deleted.

`InlineNode` carries a `kind` field even though there's only one variant, so mentions
or inline images can join later without a rename across every file.

Alignment is a block attribute rather than a mark, since you can't centre half a line.
Adding it turned up a latent bug where `setBlockType` was silently dropping `align`.

Deletion takes a unit (character, word or line) rather than being three separate
operations. The browser's input types map straight onto it.

On tooling: Vite rather than Next, because this is a client-only surface where SSR
buys nothing and hydration is a risk. And `useReducer` rather than Redux or Zustand,
because every transition is already a pure function in `core/`, which leaves about
forty lines of wiring. Editor state also belongs to one editor instance, which a
module-level store works against. The fair counter-argument is Zustand's selector
subscriptions, and the answer to that is memoizing `BlockView` by reference, which is
needed whichever library holds the state.

Tests run in `node` rather than `jsdom`, so "logic tests, not DOM snapshots" is a
structural fact rather than a promise.

## Out of scope

IME composition, rich HTML paste, collaboration, and nested containers like tables.
