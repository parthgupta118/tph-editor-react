import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Doc, Operations, Selection } from '../../core/model/types';
import { linkRangeAt } from '../../core/model/queries';
import {
  domMatchesSelection,
  readFromDom,
  toDomRange,
  writeToDom,
} from '../../dom/selection';
import { BlockView } from './BlockView';
import { insertPlainText } from './paste';
import { LinkPopover } from '../Toolbar/LinkPopover';
import { Overlay } from '../Toolbar/Overlay';

type Props = {
  doc: Doc;
  selection: Selection | null;
  run: (operation: Operations) => void;
  setSelection: (selection: Selection | null) => void;
  onLinkClick: (selection: Selection) => void;
  linkOpen: boolean;
  linkHref: string;
  onLinkApply: (href: string) => void;
  onLinkClose: () => void;
  undo: () => void;
  redo: () => void;
};

export function Editor({
  doc,
  selection,
  run,
  setSelection,
  onLinkClick,
  linkOpen,
  linkHref,
  onLinkApply,
  onLinkClose,
  undo,
  redo,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const writingCaret = useRef(false);

  const onBeforeInput = useCallback(
    (input: InputEvent) => {
      input.preventDefault();

      switch (input.inputType) {
        case 'insertText':
          if (input.data) run({ type: 'insertText', text: input.data });
          return;

        case 'insertParagraph':
          run({ type: 'splitBlock' });
          return;

        case 'deleteContentBackward':
        case 'deleteWordBackward':
        case 'deleteByCut':
          run({ type: 'deleteBackward' });
          return;

        case 'deleteContentForward':
        case 'deleteWordForward':
          run({ type: 'deleteForward' });
          return;

        case 'historyUndo':
          undo();
          return;

        case 'historyRedo':
          redo();
          return;

        case 'insertFromPaste':
          insertPlainText(input.dataTransfer?.getData('text/plain') ?? '', run);
          return;

        default:
          return;
      }
    },
    [run, undo, redo],
  );

  // Attached natively rather than through React's onBeforeInput prop. React's is a
  // synthetic event predating the beforeinput spec — it doesn't fire for deletions
  // and its inputType is unreliable.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const listener = (event: Event) => onBeforeInput(event as InputEvent);
    root.addEventListener('beforeinput', listener);
    return () => root.removeEventListener('beforeinput', listener);
  }, [onBeforeInput]);

  // Because every input is prevented, the browser's own undo stack stays empty, so
  // Cmd+Z never reaches us as a historyUndo input. Catch the keys directly.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };

    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  // The browser owns where the caret is until something edits, so we track it.
  useEffect(() => {
    const onSelectionChange = () => {
      if (writingCaret.current) return;
      const root = rootRef.current;
      if (!root) return;

      const next = readFromDom(root, doc);
      // Focus moving to the toolbar or the link popover puts the caret outside the
      // editor. Keep the last known selection so those controls still have
      // something to act on.
      if (next) setSelection(next);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [doc, setSelection]);

  // Clicking a link acts on the whole link rather than the character under the
  // caret, so the popover can edit or remove it.
  const onClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const root = rootRef.current;
      if (!root) return;
      if (!(event.target as HTMLElement).closest('a')) return;

      const at = readFromDom(root, doc);
      if (!at) return;

      const link = linkRangeAt(doc, at.anchor);
      if (!link) return;

      setSelection(link.selection);
      onLinkClick(link.selection);
    },
    [doc, setSelection, onLinkClick],
  );

  // The browser stops painting the selection once focus moves to the link popover,
  // we have to so paint it ourselves while that's open.
  const [highlight, setHighlight] = useState<DOMRect[]>([]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const range = linkOpen && root && selection ? toDomRange(root, selection) : null;
    setHighlight(range ? Array.from(range.getClientRects()) : []);
  }, [linkOpen, selection, doc]);

  // Re-rendering replaces text nodes, which destroys the caret. Put it back before
  // the browser paints, or it visibly jumps for a frame on every keystroke.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !selection) return;
    if (!root.contains(document.activeElement)) return;
    if (domMatchesSelection(root, selection)) return;

    writingCaret.current = true;
    writeToDom(root, selection);
    writingCaret.current = false;
  });

  return (
    <>
      <Overlay rects={highlight}>
        {linkOpen && (
          <LinkPopover href={linkHref} onApply={onLinkApply} onClose={onLinkClose} />
        )}
      </Overlay>
      <div
        ref={rootRef}
        className="editor min-h-96 px-5 py-4 text-[15px]"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        spellCheck={false}
        onClick={onClick}
      >
        {doc.blocks.map((block) => (
          <BlockView key={block.id} block={block} />
        ))}
      </div>
    </>
  );
}
