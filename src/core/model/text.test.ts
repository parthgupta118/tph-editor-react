import { describe, expect, it } from 'vitest';
import type { Block, InlineNode, Marks } from './types';
import { blockLength, blockText, clampOffset, resolve } from './text';

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

// "Hello world" — "Hello " plain, "world" bold. Boundary sits at offset 6.
const block = para(run('Hello '), run('world', { bold: true }));

describe('blockText / blockLength', () => {
  it('concatenates children, ignoring marks', () => {
    expect(blockText(block)).toBe('Hello world');
    expect(blockLength(block)).toBe(11);
  });

  it('handles an empty block', () => {
    const empty = para(run(''));
    expect(blockText(empty)).toBe('');
    expect(blockLength(empty)).toBe(0);
  });
});

describe('clampOffset', () => {
  it('clamps below zero and past the end, and leaves valid offsets alone', () => {
    expect(clampOffset(block, -5)).toBe(0);
    expect(clampOffset(block, 99)).toBe(11);
    expect(clampOffset(block, 4)).toBe(4);
    expect(clampOffset(block, 11)).toBe(11);
  });
});

describe('resolve', () => {
  it('resolves the start of the block', () => {
    expect(resolve(block, 0)).toEqual({ index: 0, inner: 0 });
  });

  it('resolves inside the first child', () => {
    expect(resolve(block, 3)).toEqual({ index: 0, inner: 3 });
  });

  it('resolves a child boundary to the END of the earlier child', () => {
    // offset 6 is both "end of child 0" and "start of child 1".
    // The convention is the earlier child, decided once so callers agree.
    expect(resolve(block, 6)).toEqual({ index: 0, inner: 6 });
  });

  it('resolves inside a later child', () => {
    expect(resolve(block, 8)).toEqual({ index: 1, inner: 2 });
  });

  it('resolves the end of the block', () => {
    expect(resolve(block, 11)).toEqual({ index: 1, inner: 5 });
  });

  it('clamps an out-of-range offset before resolving', () => {
    expect(resolve(block, 99)).toEqual({ index: 1, inner: 5 });
    expect(resolve(block, -1)).toEqual({ index: 0, inner: 0 });
  });

  it('resolves offset 0 in an empty block', () => {
    expect(resolve(para(run('')), 0)).toEqual({ index: 0, inner: 0 });
  });
});
