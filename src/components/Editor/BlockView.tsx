import { memo } from 'react';
import type { Block } from '../../core/model/types';
import { assertNever } from '../../core/model/types';
import { blockText } from '../../core/model/text';
import { BLOCK_ID_ATTR } from '../../dom/selection';
import { Inline } from './Inline';

// Memoized by block reference. Operations only rebuild the blocks they touch, so
// typing re-renders one block rather than the document.
const BlockView = memo(function BlockView({ block }: { block: Block }) {
  // An empty block has no text node, so there'd be nowhere to put the caret and it
  // would collapse to zero height.
  const children =
    blockText(block) === '' ? (
      <br />
    ) : (
      block.children.map((child, i) => <Inline key={i} node={child} />)
    );

  const props = {
    [BLOCK_ID_ATTR]: block.id,
    children,
    ...(block.align && { style: { textAlign: block.align } }),
  };

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

export default BlockView;
