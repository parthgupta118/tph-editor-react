import type { Doc, Operations, Selection } from '../model/types';

export type Entry = { doc: Doc; selection: Selection | null };

export type History = {
  past: Entry[];
  future: Entry[];
  lastAt: number;
  lastKind: RunKind;
};

// What the previous edit was, so we know whether the next one continues it.
type RunKind = 'insert' | 'delete' | 'other' | null;

const COALESCE_MS = 500;
const MAX_ENTRIES = 100;

export function createHistory(initial: Entry): History {
  return { past: [initial], future: [], lastAt: 0, lastKind: null };
}

export function canUndo(history: History): boolean {
  return history.past.length > 1;
}

export function canRedo(history: History): boolean {
  return history.future.length > 0;
}

// This will be called after an operation has produced a new document.
export function record(
  history: History,
  operation: Operations,
  next: Entry,
  now: number,
): History {
  const top = history.past[history.past.length - 1];

  // It is safe to compare by value because normalization gives one shape per document.
  if (top && sameDoc(top.doc, next.doc)) {
    return { ...history, past: [...history.past.slice(0, -1), next] };
  }

  const kind = runKind(operation);
  if (top && continuesRun(history, kind, now)) {
    return {
      past: [...history.past.slice(0, -1), next],
      future: [],
      lastAt: now,
      lastKind: kind,
    };
  }

  return {
    past: cap([...history.past, next]),
    future: [],
    lastAt: now,
    lastKind: kind,
  };
}

export function undo(history: History): { history: History; entry: Entry } | null {
  if (!canUndo(history)) return null;

  const current = history.past[history.past.length - 1]!;
  const previous = history.past[history.past.length - 2]!;

  return {
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future],
      lastAt: 0,
      lastKind: null,
    },
    entry: previous,
  };
}

export function redo(history: History): { history: History; entry: Entry } | null {
  if (!canRedo(history)) return null;

  const next = history.future[0]!;

  return {
    history: {
      past: cap([...history.past, next]),
      future: history.future.slice(1),
      lastAt: 0,
      lastKind: null,
    },
    entry: next,
  };
}

// This is for when typing runs together it will get into one undo step.
function continuesRun(history: History, kind: RunKind, now: number): boolean {
  if (kind === 'other' || kind === null) return false;
  if (kind !== history.lastKind) return false;
  return now - history.lastAt < COALESCE_MS;
}

function runKind(operation: Operations): RunKind {
  switch (operation.type) {
    case 'insertText':
      return 'insert';
    case 'deleteBackward':
    case 'deleteForward':
      return 'delete';
    default:
      return 'other';
  }
}

function cap(entries: Entry[]): Entry[] {
  return entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;
}

function sameDoc(a: Doc, b: Doc): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}
