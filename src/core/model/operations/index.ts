import { assertNever, type EditorState, type Operations } from '../types';
import { isCollapsed } from '../../selection/position';
import {
  deleteBackward,
  deleteForward,
  deleteRange,
  insertText,
  mergeWithPrevious,
} from './editText';
import { setAlign, setBlockType, splitBlock } from './editBlocks';
import { setLink, toggleMark, togglePendingMark } from './editMarks';

export type { OperationResult } from './editText';
export { insertText, deleteRange, deleteBackward, deleteForward, mergeWithPrevious };
export { splitBlock, setBlockType, setAlign };
export { setLink, toggleMark, togglePendingMark };

// Single entry point. Everything the UI does goes through here.
export function apply(state: EditorState, operation: Operations): EditorState {
  const { doc, selection, pendingMarks } = state;
  if (!selection) return state;

  switch (operation.type) {
    case 'insertText':
      return { ...insertText(doc, selection, operation.text, pendingMarks), pendingMarks: null };

    case 'deleteBackward':
      return { ...deleteBackward(doc, selection, operation.unit), pendingMarks: null };

    case 'deleteForward':
      return { ...deleteForward(doc, selection, operation.unit), pendingMarks: null };

    case 'splitBlock':
      return { ...splitBlock(doc, selection), pendingMarks: null };

    case 'toggleMark':
      return isCollapsed(selection)
        ? { ...state, pendingMarks: togglePendingMark(doc, selection, pendingMarks, operation.mark) }
        : { ...toggleMark(doc, selection, operation.mark), pendingMarks: null };

    case 'setLink':
      return { ...setLink(doc, selection, operation.href), pendingMarks: null };

    case 'setAlign':
      return { ...setAlign(doc, selection, operation.align), pendingMarks: null };

    case 'setBlockType':
      return { ...setBlockType(doc, selection, operation), pendingMarks: null };

    default:
      return assertNever(operation);
  }
}
