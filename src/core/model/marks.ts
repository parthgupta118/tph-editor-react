import type { Block, Marks, ToggleableMark } from './types';
import { resolve } from './text';

export function marksEqual(a: Marks, b: Marks): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.link === b.link
  );
}

export function withMark(marks: Marks, mark: ToggleableMark): Marks {
  return { ...marks, [mark]: true };
}

// We are removing the key rather than setting it to undefined. 
// JSON.stringify drops undefined keys, so the object shape would 
// change across a round trip and deepEqual fails.
export function withoutMark(marks: Marks, mark: ToggleableMark): Marks {
  const { [mark]: _drop, ...rest } = marks;
  return rest;
}

export function withLink(marks: Marks, href: string): Marks {
  return { ...marks, link: href };
}

export function withoutLink(marks: Marks): Marks {
  const { link: _drop, ...rest } = marks;
  return rest;
}

export function hasMark(marks: Marks, mark: ToggleableMark): boolean {
  return marks[mark] === true;
}

// At offset 0 there is nothing before, so it picks up the character after.
export function marksAt(block: Block, offset: number): Marks {
  const { index } = resolve(block, offset);
  return block.children[index]?.marks ?? {};
}
