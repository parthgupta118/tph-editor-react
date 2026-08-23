import type { Operations } from '../../core/model/types';

// Rich HTML paste is out of scope. Plain text keeps paste working: each newline
// becomes a block split.
export function insertPlainText(text: string, run: (operation: Operations) => void) {
  if (!text) return;

  text.split(/\r?\n/).forEach((line, index) => {
    if (index > 0) run({ type: 'splitBlock' });
    if (line) run({ type: 'insertText', text: line });
  });
}
