import { describe, expect, it } from 'vitest';
import type { Block, Doc, InlineNode, Marks } from '../types';
import { blockText } from '../text';
import { deleteRange, insertText } from './editText';

const run = (text: string, marks: Marks = {}): InlineNode => ({ kind: 'text', text, marks });
const para = (id: string, ...children: InlineNode[]): Block => ({
  id,
  type: 'paragraph',
  children,
});

const at = (blockId: string, offset: number) => ({ blockId, offset });
const caret = (blockId: string, offset: number) => ({
  anchor: at(blockId, offset),
  focus: at(blockId, offset),
});
const range = (a: [string, number], b: [string, number]) => ({
  anchor: at(a[0], a[1]),
  focus: at(b[0], b[1]),
});

// "Hello world", bold from offset 6.
const oneBlock: Doc = { blocks: [para('b1', run('Hello '), run('world', { bold: true }))] };

const twoBlocks: Doc = {
  blocks: [para('b1', run('Hello')), para('b2', run('world'))],
};

describe('deleteRange', () => {
  it('does nothing when collapsed', () => {
    const out = deleteRange(oneBlock, caret('b1', 3));
    expect(out.doc).toBe(oneBlock);
  });

  it('deletes inside one child', () => {
    const out = deleteRange(oneBlock, range(['b1', 1], ['b1', 4]));
    expect(blockText(out.doc.blocks[0]!)).toBe('Ho world');
    expect(out.selection).toEqual(caret('b1', 1));
  });

  it('deletes across children and keeps the surviving marks', () => {
    const out = deleteRange(oneBlock, range(['b1', 3], ['b1', 9]));
    expect(blockText(out.doc.blocks[0]!)).toBe('Helld');
    expect(out.doc.blocks[0]!.children).toEqual([run('Hel'), run('ld', { bold: true })]);
  });

  it('handles a backwards selection', () => {
    const out = deleteRange(oneBlock, range(['b1', 4], ['b1', 1]));
    expect(blockText(out.doc.blocks[0]!)).toBe('Ho world');
    expect(out.selection).toEqual(caret('b1', 1));
  });

  it('folds two blocks into one, keeping the first id', () => {
    const out = deleteRange(twoBlocks, range(['b1', 3], ['b2', 2]));
    expect(out.doc.blocks).toHaveLength(1);
    expect(out.doc.blocks[0]!.id).toBe('b1');
    expect(blockText(out.doc.blocks[0]!)).toBe('Helrld');
    expect(out.selection).toEqual(caret('b1', 3));
  });

  it('leaves one empty run when everything goes', () => {
    const out = deleteRange(oneBlock, range(['b1', 0], ['b1', 11]));
    expect(out.doc.blocks[0]!.children).toEqual([run('')]);
  });
});

describe('insertText', () => {
  it('inserts inside a child', () => {
    const out = insertText(oneBlock, caret('b1', 2), 'X');
    expect(blockText(out.doc.blocks[0]!)).toBe('HeXllo world');
    expect(out.selection).toEqual(caret('b1', 3));
  });

  it('inherits marks from the character before the caret', () => {
    // offset 6 is the boundary: the char before is plain, so the new text is plain.
    const out = insertText(oneBlock, caret('b1', 6), 'X');
    expect(out.doc.blocks[0]!.children).toEqual([
      run('Hello X'),
      run('world', { bold: true }),
    ]);
  });

  it('inherits bold when the caret is inside bold text', () => {
    const out = insertText(oneBlock, caret('b1', 8), 'X');
    expect(out.doc.blocks[0]!.children).toEqual([
      run('Hello '),
      run('woXrld', { bold: true }),
    ]);
  });

  it('takes marks from the character after when at offset 0', () => {
    const bolded: Doc = { blocks: [para('b1', run('abc', { bold: true }))] };
    const out = insertText(bolded, caret('b1', 0), 'X');
    expect(out.doc.blocks[0]!.children).toEqual([run('Xabc', { bold: true })]);
  });

  it('pending marks win over inheritance', () => {
    const out = insertText(oneBlock, caret('b1', 2), 'X', { italic: true });
    expect(out.doc.blocks[0]!.children).toEqual([
      run('He'),
      run('X', { italic: true }),
      run('llo '),
      run('world', { bold: true }),
    ]);
  });

  it('replaces a selection', () => {
    const out = insertText(oneBlock, range(['b1', 0], ['b1', 6]), 'Bye ');
    expect(blockText(out.doc.blocks[0]!)).toBe('Bye world');
    expect(out.selection).toEqual(caret('b1', 4));
  });

  it('replaces a selection spanning blocks', () => {
    const out = insertText(twoBlocks, range(['b1', 2], ['b2', 3]), '-');
    expect(out.doc.blocks).toHaveLength(1);
    expect(blockText(out.doc.blocks[0]!)).toBe('He-ld');
  });

  it('inserts into an empty block', () => {
    const empty: Doc = { blocks: [para('b1', run(''))] };
    const out = insertText(empty, caret('b1', 0), 'hi');
    expect(out.doc.blocks[0]!.children).toEqual([run('hi')]);
    expect(out.selection).toEqual(caret('b1', 2));
  });

  it('ignores empty text', () => {
    const out = insertText(oneBlock, caret('b1', 2), '');
    expect(out.doc).toBe(oneBlock);
  });
});
