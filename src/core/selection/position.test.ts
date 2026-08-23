import { describe, expect, it } from 'vitest';
import type { Block, Doc, InlineNode } from '../model/types';
import {
  clampPosition,
  clampSelection,
  collapsedAt,
  comparePositions,
  isCollapsed,
  orderSelection,
  positionsEqual,
} from './position';

const run = (text: string): InlineNode => ({ kind: 'text', text, marks: {} });
const para = (id: string, text: string): Block => ({
  id,
  type: 'paragraph',
  children: [run(text)],
});

const doc: Doc = { blocks: [para('b1', 'Hello'), para('b2', 'world!')] };

const at = (blockId: string, offset: number) => ({ blockId, offset });

describe('comparePositions', () => {
  it('orders by offset inside one block', () => {
    expect(comparePositions(doc, at('b1', 1), at('b1', 4))).toBeLessThan(0);
    expect(comparePositions(doc, at('b1', 4), at('b1', 1))).toBeGreaterThan(0);
    expect(comparePositions(doc, at('b1', 2), at('b1', 2))).toBe(0);
  });

  it('orders by block order across blocks', () => {
    expect(comparePositions(doc, at('b1', 99), at('b2', 0))).toBeLessThan(0);
    expect(comparePositions(doc, at('b2', 0), at('b1', 0))).toBeGreaterThan(0);
  });
});

describe('positionsEqual / isCollapsed', () => {
  it('compares both fields', () => {
    expect(positionsEqual(at('b1', 3), at('b1', 3))).toBe(true);
    expect(positionsEqual(at('b1', 3), at('b2', 3))).toBe(false);
    expect(positionsEqual(at('b1', 3), at('b1', 4))).toBe(false);
  });

  it('detects a caret', () => {
    expect(isCollapsed(collapsedAt(at('b1', 2)))).toBe(true);
    expect(isCollapsed({ anchor: at('b1', 2), focus: at('b1', 3) })).toBe(false);
  });
});

describe('orderSelection', () => {
  it('leaves a forward selection alone', () => {
    const sel = { anchor: at('b1', 1), focus: at('b1', 4) };
    expect(orderSelection(doc, sel)).toEqual({ start: at('b1', 1), end: at('b1', 4) });
  });

  it('flips a backwards drag', () => {
    const sel = { anchor: at('b1', 4), focus: at('b1', 1) };
    expect(orderSelection(doc, sel)).toEqual({ start: at('b1', 1), end: at('b1', 4) });
  });

  it('flips a backwards drag across blocks', () => {
    const sel = { anchor: at('b2', 2), focus: at('b1', 1) };
    expect(orderSelection(doc, sel)).toEqual({ start: at('b1', 1), end: at('b2', 2) });
  });
});

describe('clampPosition', () => {
  it('clamps past the end', () => {
    expect(clampPosition(doc, at('b1', 99))).toEqual(at('b1', 5));
  });

  it('clamps below zero', () => {
    expect(clampPosition(doc, at('b1', -3))).toEqual(at('b1', 0));
  });

  it('returns null for a block that no longer exists', () => {
    expect(clampPosition(doc, at('gone', 0))).toBeNull();
  });
});

describe('clampSelection', () => {
  it('clamps both ends', () => {
    const sel = { anchor: at('b1', -1), focus: at('b2', 99) };
    expect(clampSelection(doc, sel)).toEqual({ anchor: at('b1', 0), focus: at('b2', 6) });
  });

  it('returns null if either end is gone', () => {
    expect(clampSelection(doc, { anchor: at('gone', 0), focus: at('b1', 0) })).toBeNull();
  });
});
