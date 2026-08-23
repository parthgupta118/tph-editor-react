import type {
  Align,
  HeadingLevel,
  Marks,
  Operations,
  Selection,
  ToggleableMark,
} from '../../core/model/types';
import { isCollapsed } from '../../core/selection/position';
import Button from '../ui/Button';
import Divider from '../ui/Divider';
import { AlignIcon, LinkIcon } from '../ui/icons';

type Props = {
  activeMarks: Marks;
  selection: Selection | null;
  blockType: 'paragraph' | `h${HeadingLevel}` | null;
  align: Align;
  canUndo: boolean;
  canRedo: boolean;
  run: (operation: Operations) => void;
  undo: () => void;
  redo: () => void;
  linkOpen: boolean;
  onLinkOpenChange: (open: boolean) => void;
};

// Declared rather than hand-written per button, so a new control is one entry.
const MARKS: Array<{ mark: ToggleableMark; label: string; hint: string; style: string }> =
  [
    { mark: 'bold', label: 'Bold', hint: '⌘B', style: 'font-semibold' },
    { mark: 'italic', label: 'Italic', hint: '⌘I', style: 'italic' },
    { mark: 'underline', label: 'Underline', hint: '⌘U', style: 'underline' },
  ];

const blockTypes = ['paragraph', 'h1', 'h2', 'h3'] as const;
const alignments: Align[] = ['left', 'center', 'right'];

export function Toolbar({
  activeMarks,
  selection,
  blockType,
  align,
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
      {MARKS.map(({ mark, label, hint, style }) => (
        <Button
          key={mark}
          label={`${label} (${hint})`}
          active={activeMarks[mark] === true}
          disabled={noSelection}
          onClick={() => run({ type: 'toggleMark', mark })}
        >
          <span className={style}>{label[0]}</span>
        </Button>
      ))}
      <Button
        label="Link"
        active={activeMarks.link !== undefined}
        // A link needs text to attach to, so a caret alone can't create one.
        disabled={!hasRange}
        onClick={() => onLinkOpenChange(!linkOpen)}
      >
        <LinkIcon />
      </Button>

      <Divider />

      {blockTypes.map((type) => (
        <Button
          key={type}
          label={type === 'paragraph' ? 'Normal' : `Heading ${type[1]}`}
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
          {type === 'paragraph' ? 'Normal' : type.toUpperCase()}
        </Button>
      ))}

      <Divider />

      {alignments.map((value) => (
        <Button
          key={value}
          label={`Align ${value}`}
          active={align === value}
          disabled={noSelection}
          onClick={() => run({ type: 'setAlign', align: value })}
        >
          <AlignIcon align={value} />
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
