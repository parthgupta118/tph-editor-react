import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { Block, Doc, InlineNode, Operations, Selection } from '../core/model/types';
import { assertNever } from '../core/model/types';
import { blockText } from '../core/model/text';
import { BLOCK_ID_ATTR, domMatchesSelection, readFromDom, writeToDom } from '../dom/selection';

type Props = {
  doc: Doc;
  selection: Selection | null;
  run: (operation: Operations) => void;
  setSelection: (selection: Selection | null) => void;
  undo: () => void;
  redo: () => void;
};

export function Editor({ doc, selection, run, setSelection, undo, redo }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Set while we write the caret ourselves, so the selectionchange it triggers
  // doesn't come straight back in as user input.
  const writingCaret = useRef(false);

  const onBeforeInput = useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const input = event.nativeEvent as InputEvent;

      // Nothing gets through. An unhandled input type that slipped past would let
      // the DOM drift from the model, and every offset after that is wrong.
      event.preventDefault();

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

        // Cmd+Z inside a contenteditable asks the browser to run its own undo
        // against DOM it doesn't understand. Take it.
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

  // The browser owns where the caret is until something edits, so we track it.
  useEffect(() => {
    const onSelectionChange = () => {
      if (writingCaret.current) return;
      const root = rootRef.current;
      if (!root) return;
      setSelection(readFromDom(root, doc));
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [doc, setSelection]);

  // Re-rendering replaces text nodes, which destroys the caret. Put it back before
  // the browser paints, or it visibly jumps for a frame on every keystroke.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !selection) return;
    if (domMatchesSelection(root, selection)) return;

    writingCaret.current = true;
    writeToDom(root, selection);
    writingCaret.current = false;
  });

  return (
    <div
      ref={rootRef}
      className="editor"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      spellCheck={false}
      onBeforeInput={onBeforeInput}
    >
      {doc.blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

// Memoized by block reference. Operations only rebuild the blocks they touch, so
// typing re-renders one block rather than the document.
const BlockView = memo(function BlockView({ block }: { block: Block }) {
  const children =
    blockText(block) === '' ? <br /> : block.children.map((child, i) => renderNode(child, i));

  const props = { [BLOCK_ID_ATTR]: block.id, children };

  switch (block.type) {
    case 'paragraph':
      return <p {...props} />;
    case 'heading':
      return block.level === 1 ? <h1 {...props} /> : block.level === 2 ? <h2 {...props} /> : <h3 {...props} />;
    default:
      return assertNever(block);
  }
});

// Fixed nesting order, so the same document always produces the same DOM.
function renderNode(node: InlineNode, key: number) {
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

// Rich HTML paste is out of scope. Plain text keeps paste working: each newline
// becomes a block split.
function insertPlainText(text: string, run: (operation: Operations) => void) {
  if (!text) return;
  text.split(/\r?\n/).forEach((line, index) => {
    if (index > 0) run({ type: 'splitBlock' });
    if (line) run({ type: 'insertText', text: line });
  });
}
