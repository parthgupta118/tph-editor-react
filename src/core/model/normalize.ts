import type { Block, Doc, InlineNode } from './types';
import { marksEqual } from './marks';

const emptyRun = (): InlineNode => ({ kind: 'text', text: '', marks: {} });

// It cleans up identical neighbors and empty nodes. 
// We do this after every operation so deepEqual actually works for history tracking.
export function normalizeBlock(block: Block): Block {
  const merged: InlineNode[] = [];

  for (const child of block.children) {
    if (child.text === '') continue;

    const previous = merged[merged.length - 1];
    if (previous && marksEqual(previous.marks, child.marks)) {
      merged[merged.length - 1] = { ...previous, text: previous.text + child.text };
    } else {
      merged.push(child);
    }
  }

  // Marks are reset here on purpose — carrying the deleted text's marks 
  // would make two identical-looking blocks compare unequal.
  if (merged.length === 0) merged.push(emptyRun());

  return { ...block, children: merged };
}

export function normalizeDoc(doc: Doc): Doc {
  const blocks = doc.blocks.map(normalizeBlock);
  if (blocks.length > 0) return { blocks };

  return {
    blocks: [{ id: crypto.randomUUID(), type: 'paragraph', children: [emptyRun()] }],
  };
}
