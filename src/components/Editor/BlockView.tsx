import { memo } from 'react';
import type { Block, InlineNode } from '../../core/model/types';
import { assertNever } from '../../core/model/types';
import { blockText } from '../../core/model/text';
import { BLOCK_ID_ATTR } from '../../dom/selection';

// Memoized by block reference. Operations only rebuild the blocks they touch, so
// typing re-renders one block rather than the document.
export const BlockView = memo(function BlockView({ block }: { block: Block }) {
  // An empty block has no text node, so there'd be nowhere to put the caret and it
  // would collapse to zero height.
  const children =
    blockText(block) === '' ? <br /> : block.children.map((child, i) => renderInline(child, i));

  const props = { [BLOCK_ID_ATTR]: block.id, children };

  switch (block.type) {
    case 'paragraph':
      return <p {...props} />;
    case 'heading':
      if (block.level === 1) return <h1 {...props} />;
      if (block.level === 2) return <h2 {...props} />;
      return <h3 {...props} />;
    default:
      return assertNever(block);
  }
});

// Fixed nesting order, so the same document always produces the same DOM.
function renderInline(node: InlineNode, key: number) {
  let element = <>{node.text}</>;
  if (node.marks.italic) element = <em>{element}</em>;
  if (node.marks.bold) element = <strong>{element}</strong>;
  if (node.marks.link) {
    element = (
      <a href={node.marks.link} rel="noreferrer noopener">
        {element}
      </a>
    );
  }
  return <span key={key}>{element}</span>;
}
