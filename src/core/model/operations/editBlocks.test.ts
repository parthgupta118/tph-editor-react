import { describe, expect, it } from 'vitest';
import { caret, docOf, head, para, range, run } from '../../test-builders';
import { blockText } from '../text';
import { setAlign, setBlockType, splitBlock } from './editBlocks';
import { deleteBackward, deleteForward, mergeWithPrevious } from './editText';

const oneLine = docOf(para('b1', run('Hello world')));
const twoLines = docOf(para('b1', run('Hello')), para('b2', run('world')));

describe('splitBlock', () => {
  it('splits in the middle and keeps the id on the first half', () => {
    const out = splitBlock(oneLine, caret('b1', 5));
    expect(out.doc.blocks).toHaveLength(2);
    expect(out.doc.blocks[0]!.id).toBe('b1');
    expect(blockText(out.doc.blocks[0]!)).toBe('Hello');
    expect(blockText(out.doc.blocks[1]!)).toBe(' world');
    expect(out.selection).toEqual(caret(out.doc.blocks[1]!.id, 0));
  });

  it('splits at the start, leaving the first block empty', () => {
    const out = splitBlock(oneLine, caret('b1', 0));
    expect(blockText(out.doc.blocks[0]!)).toBe('');
    expect(blockText(out.doc.blocks[1]!)).toBe('Hello world');
  });

  it('splits at the end, leaving the second block empty', () => {
    const out = splitBlock(oneLine, caret('b1', 11));
    expect(blockText(out.doc.blocks[0]!)).toBe('Hello world');
    expect(blockText(out.doc.blocks[1]!)).toBe('');
  });

  it('keeps marks on both halves', () => {
    const marked = docOf(para('b1', run('ab', { bold: true })));
    const out = splitBlock(marked, caret('b1', 1));
    expect(out.doc.blocks[0]!.children).toEqual([run('a', { bold: true })]);
    expect(out.doc.blocks[1]!.children).toEqual([run('b', { bold: true })]);
  });

  it('starts a paragraph on enter at the end of a heading', () => {
    const out = splitBlock(docOf(head('h1', 1, run('Title'))), caret('h1', 5));
    expect(out.doc.blocks[0]!.type).toBe('heading');
    expect(out.doc.blocks[1]!.type).toBe('paragraph');
  });

  it('leaves two headings when splitting mid-heading', () => {
    const out = splitBlock(docOf(head('h1', 2, run('Title'))), caret('h1', 2));
    expect(out.doc.blocks[0]).toMatchObject({ type: 'heading', level: 2 });
    expect(out.doc.blocks[1]).toMatchObject({ type: 'heading', level: 2 });
  });

  it('deletes the selection first', () => {
    const out = splitBlock(oneLine, range(['b1', 5], ['b1', 11]));
    expect(blockText(out.doc.blocks[0]!)).toBe('Hello');
    expect(blockText(out.doc.blocks[1]!)).toBe('');
  });
});

describe('mergeWithPrevious', () => {
  it('joins into the earlier block and puts the caret on the seam', () => {
    const out = mergeWithPrevious(twoLines, caret('b2', 0));
    expect(out.doc.blocks).toHaveLength(1);
    expect(out.doc.blocks[0]!.id).toBe('b1');
    expect(blockText(out.doc.blocks[0]!)).toBe('Helloworld');
    expect(out.selection).toEqual(caret('b1', 5));
  });

  it('keeps the earlier block type', () => {
    const mixed = docOf(head('h1', 1, run('Title')), para('b2', run('text')));
    const out = mergeWithPrevious(mixed, caret('b2', 0));
    expect(out.doc.blocks[0]).toMatchObject({ type: 'heading', level: 1 });
  });

  it('does nothing on the first block', () => {
    const out = mergeWithPrevious(twoLines, caret('b1', 0));
    expect(out.doc).toBe(twoLines);
  });
});

describe('deleteBackward', () => {
  it('removes one character', () => {
    const out = deleteBackward(twoLines, caret('b1', 5));
    expect(blockText(out.doc.blocks[0]!)).toBe('Hell');
    expect(out.selection).toEqual(caret('b1', 4));
  });

  it('merges into the previous block at offset 0', () => {
    const out = deleteBackward(twoLines, caret('b2', 0));
    expect(out.doc.blocks).toHaveLength(1);
    expect(blockText(out.doc.blocks[0]!)).toBe('Helloworld');
  });

  it('deletes a selection instead of one character', () => {
    const out = deleteBackward(twoLines, range(['b1', 1], ['b1', 4]));
    expect(blockText(out.doc.blocks[0]!)).toBe('Ho');
  });
});

describe('deleteForward', () => {
  it('removes the character after the caret', () => {
    const out = deleteForward(twoLines, caret('b1', 0));
    expect(blockText(out.doc.blocks[0]!)).toBe('ello');
    expect(out.selection).toEqual(caret('b1', 0));
  });

  it('pulls the next block up when at the end', () => {
    const out = deleteForward(twoLines, caret('b1', 5));
    expect(out.doc.blocks).toHaveLength(1);
    expect(blockText(out.doc.blocks[0]!)).toBe('Helloworld');
  });

  it('does nothing at the end of the last block', () => {
    const out = deleteForward(twoLines, caret('b2', 5));
    expect(out.doc).toBe(twoLines);
  });
});

describe('setBlockType', () => {
  const doc = docOf(para('b1', run('one', { bold: true })), para('b2', run('two')));

  it('turns a paragraph into a heading without touching children', () => {
    const out = setBlockType(doc, caret('b1', 0), {
      type: 'setBlockType',
      blockType: 'heading',
      level: 2,
    });
    expect(out.doc.blocks[0]).toMatchObject({ type: 'heading', level: 2 });
    expect(out.doc.blocks[0]!.children).toEqual([run('one', { bold: true })]);
  });

  it('turns a heading back into a paragraph', () => {
    const out = setBlockType(docOf(head('h1', 3, run('Title'))), caret('h1', 0), {
      type: 'setBlockType',
      blockType: 'paragraph',
    });
    expect(out.doc.blocks[0]).toEqual(para('h1', run('Title')));
  });

  it('applies to every block the selection touches', () => {
    const out = setBlockType(doc, range(['b1', 1], ['b2', 1]), {
      type: 'setBlockType',
      blockType: 'heading',
      level: 1,
    });
    expect(out.doc.blocks.every((block) => block.type === 'heading')).toBe(true);
  });

  it('leaves untouched blocks alone', () => {
    const out = setBlockType(doc, caret('b1', 0), {
      type: 'setBlockType',
      blockType: 'heading',
      level: 1,
    });
    expect(out.doc.blocks[1]!.type).toBe('paragraph');
  });
});

describe('setAlign', () => {
  const doc = docOf(para('b1', run('one')), para('b2', run('two')));

  it('aligns the block the caret is in', () => {
    const out = setAlign(doc, caret('b1', 0), 'center');
    expect(out.doc.blocks[0]!.align).toBe('center');
    expect(out.doc.blocks[1]!.align).toBeUndefined();
  });

  it('aligns every block the selection touches', () => {
    const out = setAlign(doc, range(['b1', 1], ['b2', 1]), 'right');
    expect(out.doc.blocks.every((block) => block.align === 'right')).toBe(true);
  });

  it('leaves children untouched', () => {
    const marked = docOf(para('b1', run('one', { bold: true })));
    const out = setAlign(marked, caret('b1', 0), 'center');
    expect(out.doc.blocks[0]!.children).toEqual([run('one', { bold: true })]);
  });

  it('survives a block type change', () => {
    const centred = setAlign(doc, caret('b1', 0), 'center');
    const out = setBlockType(centred.doc, caret('b1', 0), {
      type: 'setBlockType',
      blockType: 'heading',
      level: 2,
    });
    expect(out.doc.blocks[0]).toMatchObject({ type: 'heading', align: 'center' });
  });
});

describe('delete units', () => {
  const doc = docOf(para('b1', run('the quick brown fox')));

  it('deletes a word backwards', () => {
    const out = deleteBackward(doc, caret('b1', 19), 'word');
    expect(blockText(out.doc.blocks[0]!)).toBe('the quick brown ');
  });

  it('skips trailing spaces before deleting the word', () => {
    const out = deleteBackward(doc, caret('b1', 16), 'word');
    expect(blockText(out.doc.blocks[0]!)).toBe('the quick fox');
  });

  it('deletes to the start of the block', () => {
    const out = deleteBackward(doc, caret('b1', 9), 'line');
    expect(blockText(out.doc.blocks[0]!)).toBe(' brown fox');
  });

  it('deletes a word forwards', () => {
    const out = deleteForward(doc, caret('b1', 0), 'word');
    expect(blockText(out.doc.blocks[0]!)).toBe(' quick brown fox');
  });

  it('deletes to the end of the block', () => {
    const out = deleteForward(doc, caret('b1', 9), 'line');
    expect(blockText(out.doc.blocks[0]!)).toBe('the quick');
  });

  it('still merges blocks at offset 0 whatever the unit', () => {
    const two = docOf(para('b1', run('one')), para('b2', run('two')));
    const out = deleteBackward(two, caret('b2', 0), 'word');
    expect(out.doc.blocks).toHaveLength(1);
    expect(blockText(out.doc.blocks[0]!)).toBe('onetwo');
  });
});
