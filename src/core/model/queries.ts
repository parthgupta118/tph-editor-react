import type { Block, Doc, InlineNode, Marks, Selection, ToggleableMark } from './types';
import { hasMark } from './marks';
import { blockLength, sliceChildren } from './text';
import { blockIndex, orderSelection } from '../selection/position';

export type CoveredBlock = { block: Block; from: number; to: number };

// The part of each block the selection actually covers.
// The first and last are cut at the selection edges.
// Middle blocks are covered end to end.
export function eachBlockInRange(doc: Doc, selection: Selection): CoveredBlock[] {
  const { start, end } = orderSelection(doc, selection);
  const first = blockIndex(doc, start.blockId);
  const last = blockIndex(doc, end.blockId);
  if (first === -1 || last === -1) return [];

  return doc.blocks.slice(first, last + 1).map((block, i) => ({
    block,
    from: i === 0 ? start.offset : 0,
    to: first + i === last ? end.offset : blockLength(block),
  }));
}

export function childrenInRange(doc: Doc, selection: Selection): InlineNode[] {
  return eachBlockInRange(doc, selection).flatMap(({ block, from, to }) =>
    sliceChildren(block, from, to)[1].filter((child) => child.text !== ''),
  );
}

// True only when every character carries the mark. The toolbar reads the same
// answer the toggle acts on, so the button state and the click always agree.
export function rangeHasMark(doc: Doc, selection: Selection, mark: ToggleableMark): boolean {
  const covered = childrenInRange(doc, selection);
  return covered.length > 0 && covered.every((child) => hasMark(child.marks, mark));
}

export function marksInRange(doc: Doc, selection: Selection): Marks {
  const covered = childrenInRange(doc, selection);
  if (covered.length === 0) return {};

  const href = covered[0]?.marks.link;
  return {
    ...(covered.every((c) => c.marks.bold) && { bold: true as const }),
    ...(covered.every((c) => c.marks.italic) && { italic: true as const }),
    ...(href !== undefined && covered.every((c) => c.marks.link === href) && { link: href }),
  };
}
