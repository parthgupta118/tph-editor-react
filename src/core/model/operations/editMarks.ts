import type { Doc, Marks, Selection, ToggleableMark } from '../types';
import { findBlock, withChildren } from '../doc';
import { hasMark, marksAt, withLink, withMark, withoutLink, withoutMark } from '../marks';
import { normalizeBlock } from '../normalize';
import { safeHref } from '../href';
import { sliceChildren } from '../text';
import { eachBlockInRange, rangeHasMark } from '../queries';
import { isCollapsed } from '../../selection/position';
import type { OperationResult } from './editText';

// Partly marked ranges get marked. Only a fully marked range is unmarked.
export function toggleMark(
  doc: Doc,
  selection: Selection,
  mark: ToggleableMark,
): OperationResult {
  if (isCollapsed(selection)) return { doc, selection };

  const remove = rangeHasMark(doc, selection, mark);
  const doc2 = mapRange(doc, selection, (marks) =>
    remove ? withoutMark(marks, mark) : withMark(marks, mark),
  );
  return { doc: doc2, selection };
}

export function setLink(doc: Doc, selection: Selection, href: string | null): OperationResult {
  if (isCollapsed(selection)) return { doc, selection };

  // Sanitised here rather than at the UI, so nothing unsafe can reach the model
  // whatever the caller does. Rejected input removes the link.
  const safe = href === null ? null : safeHref(href);

  const doc2 = mapRange(doc, selection, (marks) =>
    safe === null ? withoutLink(marks) : withLink(marks, safe),
  );
  return { doc: doc2, selection };
}

// With nothing selected there is no text to mark, 
// so the toggle is queued for the next character instead of touching the document.
export function togglePendingMark(
  doc: Doc,
  selection: Selection,
  pendingMarks: Marks | null,
  mark: ToggleableMark,
): Marks {
  const block = findBlock(doc, selection.anchor.blockId);
  const base = pendingMarks ?? (block ? marksAt(block, selection.anchor.offset) : {});
  return hasMark(base, mark) ? withoutMark(base, mark) : withMark(base, mark);
}

function mapRange(doc: Doc, selection: Selection, transform: (marks: Marks) => Marks): Doc {
  const touched = new Map(
    eachBlockInRange(doc, selection).map(({ block, from, to }) => {
      const [before, middle, after] = sliceChildren(block, from, to);
      const marked = middle.map((child) => ({ ...child, marks: transform(child.marks) }));
      return [block.id, normalizeBlock(withChildren(block, [...before, ...marked, ...after]))];
    }),
  );

  return { blocks: doc.blocks.map((block) => touched.get(block.id) ?? block) };
}
