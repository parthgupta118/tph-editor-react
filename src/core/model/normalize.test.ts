import { describe, expect, it } from 'vitest';
import type { Block, InlineNode, Marks } from './types';
import { normalizeBlock, normalizeDoc } from './normalize';

const run = (text: string, marks: Marks = {}): InlineNode => ({
  kind: 'text',
  text,
  marks,
});
const para = (...children: InlineNode[]): Block => ({
  id: 'b1',
  type: 'paragraph',
  children,
});

describe('normalizeBlock', () => {
  it('merges adjacent children with identical marks', () => {
    const out = normalizeBlock(para(run('Hel'), run('lo')));
    expect(out.children).toEqual([run('Hello')]);
  });

  it('does not merge children with different marks', () => {
    const out = normalizeBlock(para(run('Hello '), run('world', { bold: true })));
    expect(out.children).toHaveLength(2);
  });

  it('does not merge links with different hrefs', () => {
    const out = normalizeBlock(
      para(run('a', { link: 'https://a.com' }), run('b', { link: 'https://b.com' })),
    );
    expect(out.children).toHaveLength(2);
  });

  it('merges links with the same href', () => {
    const out = normalizeBlock(
      para(run('a', { link: 'https://a.com' }), run('b', { link: 'https://a.com' })),
    );
    expect(out.children).toEqual([run('ab', { link: 'https://a.com' })]);
  });

  it('drops empty children', () => {
    const out = normalizeBlock(para(run('a'), run(''), run('b')));
    expect(out.children).toEqual([run('ab')]);
  });

  it('leaves exactly one empty run when everything is dropped', () => {
    const out = normalizeBlock(para(run(''), run('')));
    expect(out.children).toEqual([run('')]);
  });

  it('gives the placeholder empty marks even when the deleted text was marked', () => {
    // Otherwise two empty blocks would render identically and compare unequal.
    const out = normalizeBlock(para(run('', { bold: true })));
    expect(out.children).toEqual([{ kind: 'text', text: '', marks: {} }]);
  });

  it('preserves block identity and type', () => {
    const heading: Block = {
      id: 'h1',
      type: 'heading',
      level: 2,
      children: [run('a'), run('b')],
    };
    const out = normalizeBlock(heading);
    expect(out).toEqual({ id: 'h1', type: 'heading', level: 2, children: [run('ab')] });
  });

  it('is idempotent, confirming it returns the canonical form', () => {
    const messy = para(run('Hel'), run('lo'), run(''), run('!', { italic: true }));
    const once = normalizeBlock(messy);
    expect(normalizeBlock(once)).toEqual(once);
  });

  it('does not mutate its input', () => {
    const input = para(run('a'), run('b'));
    const snapshot = structuredClone(input);
    normalizeBlock(input);
    expect(input).toEqual(snapshot);
  });
});

describe('normalizeDoc', () => {
  it('normalizes every block', () => {
    const doc = { blocks: [para(run('a'), run('b'))] };
    expect(normalizeDoc(doc).blocks[0]?.children).toEqual([run('ab')]);
  });

  it('replaces an empty document with one empty paragraph', () => {
    const out = normalizeDoc({ blocks: [] });
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks[0]?.type).toBe('paragraph');
    expect(out.blocks[0]?.children).toEqual([run('')]);
  });
});
