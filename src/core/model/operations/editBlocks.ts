import type { Doc, Operations, Selection } from '../types';
import { caretAt, findBlock, withChildren } from '../doc';
import { normalizeBlock } from '../normalize';
import { blockLength, splitChildren } from '../text';
import { blockIndex, isCollapsed, orderSelection } from '../../selection/position';
import { deleteRange, type OperationResult } from './editText';

export function splitBlock(doc: Doc, selection: Selection): OperationResult {
  const collapsed = isCollapsed(selection) ? { doc, selection } : deleteRange(doc, selection);
  const at = collapsed.selection.anchor;

  const block = findBlock(collapsed.doc, at.blockId);
  if (!block) return { doc, selection };

  const [before, after] = splitChildren(block, at.offset);
  const left = normalizeBlock(withChildren(block, before));

  const atEnd = at.offset >= blockLength(block);
  const right = normalizeBlock(
    block.type === 'heading' && atEnd
      ? { id: crypto.randomUUID(), type: 'paragraph', children: after }
      : { ...block, id: crypto.randomUUID(), children: after },
  );

  const index = blockIndex(collapsed.doc, block.id);
  const blocks = collapsed.doc.blocks;

  return {
    doc: { blocks: [...blocks.slice(0, index), left, right, ...blocks.slice(index + 1)] },
    selection: caretAt(right.id, 0),
  };
}

// Children are untouched here as block type and inline marks are independent.
export function setBlockType(
  doc: Doc,
  selection: Selection,
  operation: Extract<Operations, { type: 'setBlockType' }>,
): OperationResult {
  const { start, end } = orderSelection(doc, selection);
  const from = blockIndex(doc, start.blockId);
  const to = blockIndex(doc, end.blockId);

  const blocks = doc.blocks.map((block, index) => {
    if (index < from || index > to) return block;
    return operation.blockType === 'heading'
      ? {
          id: block.id,
          type: 'heading' as const,
          level: operation.level,
          children: block.children,
        }
      : { id: block.id, type: 'paragraph' as const, children: block.children };
  });

  return { doc: { blocks }, selection };
}
