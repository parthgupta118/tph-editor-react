import type { Block, Doc, InlineNode, Marks, Position, Selection, ToggleableMark } from './types';
import { hasMark } from './marks';
import { blockLength, resolve, sliceChildren } from './text';
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

// Clicking a link should act on the whole link, not the character under the caret.
// Walks outward from the position across children sharing the same href.
export function linkRangeAt(
  doc: Doc,
  position: Position,
): { selection: Selection; href: string } | null {
  const block = doc.blocks.find((candidate) => candidate.id === position.blockId);
  if (!block) return null;

  const { index } = resolve(block, position.offset);
  const href = block.children[index]?.marks.link;
  if (href === undefined) return null;

  let first = index;
  while (block.children[first - 1]?.marks.link === href) first -= 1;

  let last = index;
  while (block.children[last + 1]?.marks.link === href) last += 1;

  let start = 0;
  for (let i = 0; i < first; i++) start += block.children[i]?.text.length ?? 0;

  let end = start;
  for (let i = first; i <= last; i++) end += block.children[i]?.text.length ?? 0;

  return {
    href,
    selection: {
      anchor: { blockId: block.id, offset: start },
      focus: { blockId: block.id, offset: end },
    },
  };
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
    ...(covered.every((c) => c.marks.underline) && { underline: true as const }),
    ...(href !== undefined && covered.every((c) => c.marks.link === href) && { link: href }),
  };
}
