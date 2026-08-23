import type { HeadingLevel, Marks, Operations, Selection } from '../../core/model/types';
import { isCollapsed } from '../../core/selection/position';
import { Button, Divider } from '../ui/Button';

type Props = {
  activeMarks: Marks;
  selection: Selection | null;
  blockType: 'paragraph' | `h${HeadingLevel}` | null;
  canUndo: boolean;
  canRedo: boolean;
  run: (operation: Operations) => void;
  undo: () => void;
  redo: () => void;
  linkOpen: boolean;
  onLinkOpenChange: (open: boolean) => void;
};

const blockTypes = ['paragraph', 'h1', 'h2', 'h3'] as const;

export function Toolbar({
  activeMarks,
  selection,
  blockType,
  canUndo,
  canRedo,
  run,
  undo,
  redo,
  linkOpen,
  onLinkOpenChange,
}: Props) {

  const noSelection = selection === null;
  const hasRange = selection !== null && !isCollapsed(selection);

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="relative flex flex-wrap items-center gap-1 border-b border-line bg-canvas/60 px-2 py-1.5"
    >
      <Button
        label="Bold"
        active={activeMarks.bold === true}
        disabled={noSelection}
        onClick={() => run({ type: 'toggleMark', mark: 'bold' })}
      >
        <span className="font-semibold">B</span>
      </Button>
      <Button
        label="Italic"
        active={activeMarks.italic === true}
        disabled={noSelection}
        onClick={() => run({ type: 'toggleMark', mark: 'italic' })}
      >
        <span className="italic">I</span>
      </Button>
      <Button
        label="Link"
        active={activeMarks.link !== undefined}
        // A link needs text to attach to, so a caret alone can't create one.
        disabled={!hasRange}
        onClick={() => onLinkOpenChange(!linkOpen)}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" strokeLinecap="round" />
          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" strokeLinecap="round" />
        </svg>
      </Button>

      <Divider />

      {blockTypes.map((type) => (
        <Button
          key={type}
          label={type === 'paragraph' ? 'Paragraph' : `Heading ${type[1]}`}
          active={blockType === type}
          disabled={noSelection}
          onClick={() =>
            run(
              type === 'paragraph'
                ? { type: 'setBlockType', blockType: 'paragraph' }
                : {
                    type: 'setBlockType',
                    blockType: 'heading',
                    level: Number(type[1]) as HeadingLevel,
                  },
            )
          }
        >
          {type === 'paragraph' ? 'P' : type.toUpperCase()}
        </Button>
      ))}

      <Divider />

      <Button label="Undo" disabled={!canUndo} onClick={undo}>
        ↶
      </Button>
      <Button label="Redo" disabled={!canRedo} onClick={redo}>
        ↷
      </Button>

    </div>
  );
}
