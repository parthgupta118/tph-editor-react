import type { Doc, Position, Selection } from '../core/model/types';
import { clampSelection } from '../core/selection/position';

// This is the only module in the codebase that touches the actual DOM selection. 
// Everything it needs arithmetically lives in core and is already tested.
export const BLOCK_ID_ATTR = 'data-block-id';

export function readFromDom(root: HTMLElement, doc: Doc): Selection | null {
  const domSelection = window.getSelection();
  if (!domSelection || domSelection.rangeCount === 0) return null;

  const anchor = toPosition(root, domSelection.anchorNode, domSelection.anchorOffset);
  const focus = toPosition(root, domSelection.focusNode, domSelection.focusOffset);
  if (!anchor || !focus) return null;

  return clampSelection(doc, { anchor, focus });
}

export function selectionRects(selection: Selection): DOMRect[] {
  const root = document.querySelector<HTMLElement>(`[${BLOCK_ID_ATTR}]`)?.closest('.editor');
  if (!(root instanceof HTMLElement)) return [];

  const range = toDomRange(root, selection);
  return range ? Array.from(range.getClientRects()) : [];
}

export function toDomRange(root: HTMLElement, selection: Selection): Range | null {
  const anchor = toDomPoint(root, selection.anchor);
  const focus = toDomPoint(root, selection.focus);
  if (!anchor || !focus) return null;

  const range = document.createRange();
  range.setStart(anchor.node, anchor.offset);
  range.setEnd(focus.node, focus.offset);
  return range;
}

export function writeToDom(root: HTMLElement, selection: Selection): void {
  const range = toDomRange(root, selection);
  const domSelection = window.getSelection();
  if (!range || !domSelection) return;

  domSelection.removeAllRanges();
  domSelection.addRange(range);
}

// This code is to nudge the scroller ourselves when we reach end of container.
export function scrollCaretIntoView(root: HTMLElement, selection: Selection): void {
  const rect = toDomRange(root, selection)?.getBoundingClientRect();
  if (!rect) return;

  const view = root.getBoundingClientRect();
  const margin = 12;

  if (rect.bottom > view.bottom - margin) root.scrollTop += rect.bottom - view.bottom + margin;
  else if (rect.top < view.top + margin) root.scrollTop -= view.top - rect.top + margin;
}

export function domMatchesSelection(root: HTMLElement, selection: Selection | null): boolean {
  const domSelection = window.getSelection();
  if (!domSelection || domSelection.rangeCount === 0) return selection === null;
  if (!selection) return false;

  const anchor = toDomPoint(root, selection.anchor);
  const focus = toDomPoint(root, selection.focus);
  if (!anchor || !focus) return false;

  return (
    domSelection.anchorNode === anchor.node &&
    domSelection.anchorOffset === anchor.offset &&
    domSelection.focusNode === focus.node &&
    domSelection.focusOffset === focus.offset
  );
}

// A DOM point is text node, characters into it. Ours is block, characters into the block. 
// Walking the block's text nodes converts between the two.

function toPosition(root: HTMLElement, node: Node | null, offset: number): Position | null {
  if (!node || !root.contains(node)) return null;

  const blockEl = blockElementFor(node);
  const blockId = blockEl?.getAttribute(BLOCK_ID_ATTR);
  if (!blockEl || !blockId) return null;

  // An empty block renders a <br>, so the caret lands on the element rather than on a text node.
  if (node.nodeType !== Node.TEXT_NODE) return { blockId, offset: 0 };

  let seen = 0;
  for (const textNode of textNodesIn(blockEl)) {
    if (textNode === node) return { blockId, offset: seen + offset };
    seen += textNode.textContent?.length ?? 0;
  }
  return { blockId, offset: seen };
}

function toDomPoint(
  root: HTMLElement,
  position: Position,
): { node: Node; offset: number } | null {
  const blockEl = root.querySelector<HTMLElement>(
    `[${BLOCK_ID_ATTR}="${CSS.escape(position.blockId)}"]`,
  );
  if (!blockEl) return null;

  let remaining = position.offset;
  let last: Text | null = null;

  for (const textNode of textNodesIn(blockEl)) {
    const length = textNode.textContent?.length ?? 0;
    if (remaining <= length) return { node: textNode, offset: remaining };
    remaining -= length;
    last = textNode;
  }

  if (last) return { node: last, offset: last.textContent?.length ?? 0 };
  return { node: blockEl, offset: 0 };
}

function blockElementFor(node: Node): HTMLElement | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return element?.closest<HTMLElement>(`[${BLOCK_ID_ATTR}]`) ?? null;
}

function textNodesIn(element: HTMLElement): Text[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}
