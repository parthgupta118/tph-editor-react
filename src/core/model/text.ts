import type { Block, InlineNode } from './types';

export function blockText(block: Block): string {
  let out = '';
  for (const child of block.children) out += child.text;
  return out;
}

export function blockLength(block: Block): number {
  let n = 0;
  for (const child of block.children) n += child.text.length;
  return n;
}

export function clampOffset(block: Block, offset: number): number {
  const max = blockLength(block);
  return offset < 0 ? 0 : offset > max ? max : offset;
}

export type Resolved = { index: number; inner: number };

// An offset on a child boundary is ambiguous (end of one, start of the next).
// We always pick the earlier child. Decided here so callers can't disagree.
export function resolve(block: Block, offset: number): Resolved {
  let remaining = clampOffset(block, offset);

  for (let index = 0; index < block.children.length; index++) {
    const child = block.children[index] as InlineNode;
    if (remaining <= child.text.length) return { index, inner: remaining };
    remaining -= child.text.length;
  }

  return { index: 0, inner: 0 };
}
