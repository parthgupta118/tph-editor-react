import { useCallback, useMemo, useReducer } from 'react';
import type { Doc, EditorState, Operations, Selection } from '../core/model/types';
import { apply } from '../core/model/operations';
import { normalizeDoc } from '../core/model/normalize';
import { marksAt } from '../core/model/marks';
import { marksInRange } from '../core/model/queries';
import { isCollapsed } from '../core/selection/position';
import {
  canRedo,
  canUndo,
  createHistory,
  record,
  redo,
  undo,
  type History,
} from '../core/history/history';

type State = EditorState & { history: History };

type Action =
  | { type: 'operation'; operation: Operations; now: number }
  | { type: 'select'; selection: Selection | null }
  | { type: 'undo' }
  | { type: 'redo' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'operation': {
      const next = apply(state, action.operation);
      if (next === state) return state;

      return {
        ...next,
        history: record(
          state.history,
          action.operation,
          { doc: next.doc, selection: next.selection },
          action.now,
        ),
      };
    }

    // Moving the caret drops any queued formatting — the user changed their mind.
    case 'select':
      return { ...state, selection: action.selection, pendingMarks: null };

    case 'undo': {
      const result = undo(state.history);
      if (!result) return state;
      return {
        doc: result.entry.doc,
        selection: result.entry.selection,
        pendingMarks: null,
        history: result.history,
      };
    }

    case 'redo': {
      const result = redo(state.history);
      if (!result) return state;
      return {
        doc: result.entry.doc,
        selection: result.entry.selection,
        pendingMarks: null,
        history: result.history,
      };
    }
  }
}

function init(doc: Doc): State {
  const normalized = normalizeDoc(doc);
  return {
    doc: normalized,
    selection: null,
    pendingMarks: null,
    history: createHistory({ doc: normalized, selection: null }),
  };
}

export function useEditor(initialDoc: Doc) {
  const [state, dispatch] = useReducer(reducer, initialDoc, init);

  const run = useCallback(
    (operation: Operations) => dispatch({ type: 'operation', operation, now: Date.now() }),
    [],
  );

  const setSelection = useCallback(
    (selection: Selection | null) => dispatch({ type: 'select', selection }),
    [],
  );

  // What the toolbar shows. With a range, the marks the whole range shares. With a
  // caret, queued formatting if any, otherwise what the next character would
  // inherit — so the button matches what typing would actually produce.
  const activeMarks = useMemo(() => {
    const { doc, selection, pendingMarks } = state;
    if (!selection) return {};
    if (!isCollapsed(selection)) return marksInRange(doc, selection);
    if (pendingMarks) return pendingMarks;

    const block = doc.blocks.find((candidate) => candidate.id === selection.anchor.blockId);
    return block ? marksAt(block, selection.anchor.offset) : {};
  }, [state]);

  return {
    doc: state.doc,
    selection: state.selection,
    activeMarks,
    canUndo: canUndo(state.history),
    canRedo: canRedo(state.history),
    run,
    setSelection,
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
    redo: useCallback(() => dispatch({ type: 'redo' }), []),
  };
}
