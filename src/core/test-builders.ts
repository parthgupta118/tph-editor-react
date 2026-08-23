// Shared fixtures for the model tests
import type {
  Block,
  Doc,
  HeadingLevel,
  InlineNode,
  Marks,
  Position,
  Selection,
} from './model/types';

export const run = (text: string, marks: Marks = {}): InlineNode => ({
  kind: 'text',
  text,
  marks,
});

export const para = (id: string, ...children: InlineNode[]): Block => ({
  id,
  type: 'paragraph',
  children: children.length > 0 ? children : [run('')],
});

export const head = (id: string, level: HeadingLevel, ...children: InlineNode[]): Block => ({
  id,
  type: 'heading',
  level,
  children: children.length > 0 ? children : [run('')],
});

export const docOf = (...blocks: Block[]): Doc => ({ blocks });

export const at = (blockId: string, offset: number): Position => ({ blockId, offset });

export const caret = (blockId: string, offset: number): Selection => ({
  anchor: at(blockId, offset),
  focus: at(blockId, offset),
});

export const range = (a: [string, number], b: [string, number]): Selection => ({
  anchor: at(a[0], a[1]),
  focus: at(b[0], b[1]),
});
