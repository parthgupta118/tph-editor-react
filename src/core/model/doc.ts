import type { Block, Doc, InlineNode, Selection } from './types';

export function findBlock(doc: Doc, blockId: string): Block | undefined {
  return doc.blocks.find((block) => block.id === blockId);
}

export function withChildren(block: Block, children: InlineNode[]): Block {
  return { ...block, children };
}

export function swapBlock(doc: Doc, next: Block): Doc {
  return { blocks: doc.blocks.map((block) => (block.id === next.id ? next : block)) };
}

export function caretAt(blockId: string, offset: number): Selection {
  const position = { blockId, offset };
  return { anchor: position, focus: position };
}
