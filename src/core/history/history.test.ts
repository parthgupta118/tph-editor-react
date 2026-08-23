import { describe, expect, it } from 'vitest';
import { caret, docOf, para, run } from '../test-builders';
import type { Operations } from '../model/types';
import { canRedo, canUndo, createHistory, record, redo, undo } from './history';

const type = (text: string): Operations => ({ type: 'insertText', text });
const back: Operations = { type: 'deleteBackward' };
const bold: Operations = { type: 'toggleMark', mark: 'bold' };

const entry = (text: string, offset = text.length) => ({
  doc: docOf(para('b1', run(text))),
  selection: caret('b1', offset),
});

const start = entry('');

describe('createHistory', () => {
  it('keeps the initial document so undo can reach the start', () => {
    const history = createHistory(start);
    expect(history.past).toHaveLength(1);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });
});

describe('record', () => {
  it('pushes the first edit', () => {
    const history = record(createHistory(start), type('a'), entry('a'), 0);
    expect(history.past).toHaveLength(2);
    expect(canUndo(history)).toBe(true);
  });

  it('runs consecutive typing into one step', () => {
    let history = createHistory(start);
    history = record(history, type('a'), entry('a'), 0);
    history = record(history, type('b'), entry('ab'), 100);
    history = record(history, type('c'), entry('abc'), 200);
    expect(history.past).toHaveLength(2);
  });

  it('starts a new step once the window closes', () => {
    let history = createHistory(start);
    history = record(history, type('a'), entry('a'), 0);
    history = record(history, type('b'), entry('ab'), 900);
    expect(history.past).toHaveLength(3);
  });

  it('breaks the run on a mark toggle', () => {
    let history = createHistory(start);
    history = record(history, type('a'), entry('a'), 0);
    history = record(history, bold, { ...entry('a'), doc: docOf(para('b1', run('a', { bold: true }))) }, 50);
    expect(history.past).toHaveLength(3);
  });

  it('breaks the run when deleting after typing', () => {
    let history = createHistory(start);
    history = record(history, type('ab'), entry('ab'), 0);
    history = record(history, back, entry('a'), 50);
    expect(history.past).toHaveLength(3);
  });

  it('runs consecutive deletes together', () => {
    let history = createHistory(entry('abc'));
    history = record(history, back, entry('ab'), 0);
    history = record(history, back, entry('a'), 100);
    expect(history.past).toHaveLength(2);
  });

  it('does not push when the document is unchanged', () => {
    let history = createHistory(entry('abc'));
    history = record(history, type(''), entry('abc', 1), 0);
    expect(history.past).toHaveLength(1);
  });

  it('still updates the selection on a no-op edit', () => {
    let history = createHistory(entry('abc', 0));
    history = record(history, type(''), entry('abc', 2), 0);
    expect(history.past[0]!.selection).toEqual(caret('b1', 2));
  });

  it('clears the redo stack on a new edit', () => {
    let history = createHistory(start);
    history = record(history, type('a'), entry('a'), 0);
    const undone = undo(history)!;
    expect(canRedo(undone.history)).toBe(true);

    const after = record(undone.history, type('z'), entry('z'), 5000);
    expect(canRedo(after)).toBe(false);
  });

  it('caps the stack', () => {
    let history = createHistory(start);
    for (let i = 0; i < 150; i++) {
      history = record(history, type('x'), entry('x'.repeat(i + 1)), i * 1000);
    }
    expect(history.past.length).toBeLessThanOrEqual(100);
  });
});

describe('undo / redo', () => {
  it('restores the document and the selection together', () => {
    let history = createHistory(entry('abc', 3));
    history = record(history, back, entry('ab', 2), 0);

    const undone = undo(history)!;
    expect(undone.entry.doc).toEqual(entry('abc').doc);
    expect(undone.entry.selection).toEqual(caret('b1', 3));
  });

  it('returns null with nothing to undo', () => {
    expect(undo(createHistory(start))).toBeNull();
  });

  it('redoes what was undone', () => {
    let history = createHistory(start);
    history = record(history, type('a'), entry('a'), 0);

    const undone = undo(history)!;
    const redone = redo(undone.history)!;
    expect(redone.entry.doc).toEqual(entry('a').doc);
    expect(canRedo(redone.history)).toBe(false);
  });

  it('returns null with nothing to redo', () => {
    expect(redo(createHistory(start))).toBeNull();
  });

  it('breaks any run so typing after undo starts a new step', () => {
    let history = createHistory(start);
    history = record(history, type('a'), entry('a'), 0);
    const undone = undo(history)!;

    const after = record(undone.history, type('b'), entry('b'), 10);
    expect(after.past).toHaveLength(2);
  });
});
