import type { Doc, Position, Selection } from '../model/types';
import { clampOffset } from '../model/text';

export function blockIndex(doc: Doc, blockId: string): number {
  return doc.blocks.findIndex((block) => block.id === blockId);
}

// Needs the doc because block ordering lives there, not in the position.
// Negative if a comes first, positive if b does, zero if they're at the same spot.
export function comparePositions(doc: Doc, a: Position, b: Position): number {
  if (a.blockId === b.blockId) return a.offset - b.offset;
  return blockIndex(doc, a.blockId) - blockIndex(doc, b.blockId);
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.blockId === b.blockId && a.offset === b.offset;
}

export function isCollapsed(selection: Selection): boolean {
  return positionsEqual(selection.anchor, selection.focus);
}

// Anchor/Focus will be selected in order, so a right-to-left drag puts focus first.
export function orderSelection(doc: Doc, selection: Selection): { start: Position; end: Position } {
  const { anchor, focus } = selection;
  return comparePositions(doc, anchor, focus) <= 0
    ? { start: anchor, end: focus }
    : { start: focus, end: anchor };
}

// This will pull the offset back into range.
export function clampPosition(doc: Doc, position: Position): Position | null {
  const block = doc.blocks.find((candidate) => candidate.id === position.blockId);
  if (!block) return null;
  return { blockId: block.id, offset: clampOffset(block, position.offset) };
}

export function clampSelection(doc: Doc, selection: Selection): Selection | null {
  const anchor = clampPosition(doc, selection.anchor);
  const focus = clampPosition(doc, selection.focus);
  if (!anchor || !focus) return null;
  return { anchor, focus };
}

export function collapsedAt(position: Position): Selection {
  return { anchor: position, focus: position };
}
