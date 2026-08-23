import type { Align } from '../../core/model/types';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
} as const;

export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" {...stroke}>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

// Short lines shift to whichever edge the text hugs.
const SHORT: Record<Align, { x1: number; x2: number }> = {
  left: { x1: 4, x2: 14 },
  center: { x1: 7, x2: 17 },
  right: { x1: 10, x2: 20 },
};

export function AlignIcon({ align }: { align: Align }) {
  const { x1, x2 } = SHORT[align];
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" {...stroke}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1={x1} y1="12" x2={x2} y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

// Arrow curving back over a horizontal run — the conventional undo shape. Mirrored
// for redo rather than duplicated.
function HistoryIcon({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      {...stroke}
      strokeLinejoin="round"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M4 9h11a5 5 0 0 1 0 10h-6" />
      <path d="M8 5 4 9l4 4" />
    </svg>
  );
}

export const UndoIcon = () => <HistoryIcon />;
export const RedoIcon = () => <HistoryIcon flip />;
