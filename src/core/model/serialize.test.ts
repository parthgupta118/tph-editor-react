import { describe, expect, it } from 'vitest';
import type { Block, Doc, InlineNode, Marks } from './types';
import { DOC_VERSION, fromJSON, toJSON } from './serialize';
import { normalizeDoc } from './normalize';
import { withoutMark } from './marks';

const run = (text: string, marks: Marks = {}): InlineNode => ({
  kind: 'text',
  text,
  marks,
});

const para = (id: string, ...children: InlineNode[]): Block => ({
  id,
  type: 'paragraph',
  children,
});

const doc: Doc = {
  blocks: [
    para('b1', run('Hello '), run('world', { bold: true })),
    { id: 'b2', type: 'heading', level: 2, children: [run('Title', { italic: true })] },
    para('b3', run('link', { link: 'https://example.com' })),
  ],
};

// Goes through a real stringify/parse, not just an object copy — look at R1 for the details.
const roundTrip = (input: Doc): Doc => fromJSON(JSON.parse(JSON.stringify(toJSON(input))));

describe('serialize', () => {
  it('round trips through JSON unchanged', () => {
    expect(roundTrip(doc)).toEqual(normalizeDoc(doc));
  });

  it('writes a version', () => {
    expect(toJSON(doc).version).toBe(DOC_VERSION);
  });

  it('survives a removed mark', () => {
    // withoutMark removes the key. If we have written `undefined`, 
    // stringify would drop it and the shapes would stop matching.
    const marked = para('b1', run('x', { bold: true, italic: true }));
    const unmarked = para('b1', run('x', withoutMark({ bold: true, italic: true }, 'bold')));
    expect(roundTrip({ blocks: [unmarked] })).toEqual(normalizeDoc({ blocks: [unmarked] }));
    expect(roundTrip({ blocks: [marked] })).not.toEqual(roundTrip({ blocks: [unmarked] }));
  });

  it('normalizes on the way in', () => {
    const messy: Doc = { blocks: [para('b1', run('Hel'), run('lo'), run(''))] };
    expect(roundTrip(messy).blocks[0]?.children).toEqual([run('Hello')]);
  });

  it('rejects an unknown version', () => {
    expect(() => fromJSON({ version: 99, blocks: [] })).toThrow(/version/);
  });

  it('rejects malformed input', () => {
    expect(() => fromJSON(null)).toThrow();
    expect(() => fromJSON({ blocks: [] })).toThrow();
    expect(() => fromJSON({ version: 1 })).toThrow();
  });
});
