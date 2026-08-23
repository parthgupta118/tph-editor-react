import type { InlineNode } from '../../core/model/types';

// Marks nest in a fixed order so the same document always produces the same DOM.
export function Inline({ node }: { node: InlineNode }) {
  let element = <>{node.text}</>;
  if (node.marks.underline) element = <u>{element}</u>;
  if (node.marks.italic) element = <em>{element}</em>;
  if (node.marks.bold) element = <strong>{element}</strong>;
  if (node.marks.link) {
    element = (
      <a href={node.marks.link} rel="noreferrer noopener">
        {element}
      </a>
    );
  }
  return <span>{element}</span>;
}
