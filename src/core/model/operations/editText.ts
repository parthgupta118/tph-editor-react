import type { DeleteUnit, Doc, Marks, Selection } from '../types';
import { caretAt, findBlock, swapBlock, withChildren } from '../doc';
import { marksAt } from '../marks';
import { normalizeBlock } from '../normalize';
import { blockLength, blockText, splitChildren, wordEndAfter, wordStartBefore } from '../text';
import { blockIndex, isCollapsed, orderSelection } from '../../selection/position';

export type OperationResult = { doc: Doc; selection: Selection };

export function insertText(
  doc: Doc,
  selection: Selection,
  text: string,
  pendingMarks: Marks | null = null,
): OperationResult {
  if (text === '') return { doc, selection };

  // Typing over a selection replaces it.
  const collapsed = isCollapsed(selection) ? { doc, selection } : deleteRange(doc, selection);
  const at = collapsed.selection.anchor;

  const block = findBlock(collapsed.doc, at.blockId);
  if (!block) return { doc, selection };

  const marks = pendingMarks ?? marksAt(block, at.offset);
  const [before, after] = splitChildren(block, at.offset);

  const next = normalizeBlock(
    withChildren(block, [...before, { kind: 'text', text, marks }, ...after]),
  );

  return {
    doc: swapBlock(collapsed.doc, next),
    selection: caretAt(block.id, at.offset + text.length),
  };
}

// Across blocks this folds them into one, keeping the first block's id and type.
export function deleteRange(doc: Doc, selection: Selection): OperationResult {
  if (isCollapsed(selection)) return { doc, selection };

  const { start, end } = orderSelection(doc, selection);
  const startBlock = findBlock(doc, start.blockId);
  const endBlock = findBlock(doc, end.blockId);
  if (!startBlock || !endBlock) return { doc, selection };

  const [before] = splitChildren(startBlock, start.offset);
  const [, after] = splitChildren(endBlock, end.offset);

  const merged = normalizeBlock(withChildren(startBlock, [...before, ...after]));
  const from = blockIndex(doc, start.blockId);
  const to = blockIndex(doc, end.blockId);

  return {
    doc: { blocks: [...doc.blocks.slice(0, from), merged, ...doc.blocks.slice(to + 1)] },
    selection: caretAt(startBlock.id, start.offset),
  };
}

export function deleteBackward(
  doc: Doc,
  selection: Selection,
  unit: DeleteUnit = 'char',
): OperationResult {
  if (!isCollapsed(selection)) return deleteRange(doc, selection);

  const at = selection.anchor;
  const block = findBlock(doc, at.blockId);
  if (!block) return { doc, selection };

  // At the very start there is nothing left in this block to remove, whatever the
  // unit — fold into the block above instead.
  if (at.offset === 0) return mergeWithPrevious(doc, selection);

  const target =
    unit === 'line' ? 0
    : unit === 'word' ? wordStartBefore(blockText(block), at.offset)
    : at.offset - 1;

  return deleteRange(doc, { anchor: { blockId: at.blockId, offset: target }, focus: at });
}

export function deleteForward(
  doc: Doc,
  selection: Selection,
  unit: DeleteUnit = 'char',
): OperationResult {
  if (!isCollapsed(selection)) return deleteRange(doc, selection);

  const at = selection.anchor;
  const block = findBlock(doc, at.blockId);
  if (!block) return { doc, selection };

  const end = blockLength(block);
  if (at.offset < end) {
    const target =
      unit === 'line' ? end
      : unit === 'word' ? wordEndAfter(blockText(block), at.offset)
      : at.offset + 1;

    return deleteRange(doc, { anchor: at, focus: { blockId: at.blockId, offset: target } });
  }

  // At the end of a block, pull the next one up.
  const next = doc.blocks[blockIndex(doc, at.blockId) + 1];
  if (!next) return { doc, selection };
  return mergeWithPrevious(doc, caretAt(next.id, 0));
}

// Backspace at offset 0. The earlier block wins on both id and type.
export function mergeWithPrevious(doc: Doc, selection: Selection): OperationResult {
  const at = selection.anchor;
  const index = blockIndex(doc, at.blockId);
  const current = doc.blocks[index];
  const previous = doc.blocks[index - 1];
  if (!current || !previous) return { doc, selection };

  const seam = blockLength(previous);
  const merged = normalizeBlock(
    withChildren(previous, [...previous.children, ...current.children]),
  );

  return {
    doc: { blocks: [...doc.blocks.slice(0, index - 1), merged, ...doc.blocks.slice(index + 1)] },
    selection: caretAt(previous.id, seam),
  };
}
