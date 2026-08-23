import { describe, expect, it } from 'vitest';
import { at, caret, docOf, para, range, run } from '../test-builders';
import { childrenInRange, linkRangeAt, marksInRange, rangeHasMark } from './queries';

// "Hello world", bold from offset 6.
const doc = docOf(para('b1', run('Hello '), run('world', { bold: true })));

describe('childrenInRange', () => {
  it('returns only the covered part', () => {
    expect(childrenInRange(doc, range(['b1', 7], ['b1', 10]))).toEqual([
      run('orl', { bold: true }),
    ]);
  });

  it('spans blocks', () => {
    const two = docOf(para('b1', run('one')), para('b2', run('two')));
    expect(childrenInRange(two, range(['b1', 2], ['b2', 1]))).toEqual([run('e'), run('t')]);
  });

  it('is empty for a caret', () => {
    expect(childrenInRange(doc, caret('b1', 3))).toEqual([]);
  });
});

describe('rangeHasMark', () => {
  it('is true only when everything carries the mark', () => {
    expect(rangeHasMark(doc, range(['b1', 6], ['b1', 11]), 'bold')).toBe(true);
    expect(rangeHasMark(doc, range(['b1', 0], ['b1', 11]), 'bold')).toBe(false);
    expect(rangeHasMark(doc, range(['b1', 0], ['b1', 5]), 'bold')).toBe(false);
  });

  it('is false for a caret', () => {
    expect(rangeHasMark(doc, caret('b1', 8), 'bold')).toBe(false);
  });
});

describe('marksInRange', () => {
  it('reports marks shared by the whole range', () => {
    expect(marksInRange(doc, range(['b1', 6], ['b1', 11]))).toEqual({ bold: true });
  });

  it('drops marks only part of the range has', () => {
    expect(marksInRange(doc, range(['b1', 0], ['b1', 11]))).toEqual({});
  });

  it('reports a link only when the href matches throughout', () => {
    const same = docOf(
      para('b1', run('ab', { link: 'https://a.com' }), run('cd', { link: 'https://a.com' })),
    );
    const mixed = docOf(
      para('b1', run('ab', { link: 'https://a.com' }), run('cd', { link: 'https://b.com' })),
    );
    expect(marksInRange(same, range(['b1', 0], ['b1', 4]))).toEqual({ link: 'https://a.com' });
    expect(marksInRange(mixed, range(['b1', 0], ['b1', 4]))).toEqual({});
  });

  it('combines marks', () => {
    const both = docOf(para('b1', run('ab', { bold: true, italic: true })));
    expect(marksInRange(both, range(['b1', 0], ['b1', 2]))).toEqual({
      bold: true,
      italic: true,
    });
  });

  it('is empty for a caret', () => {
    expect(marksInRange(doc, caret('b1', 8))).toEqual({});
  });
});

describe('linkRangeAt', () => {
  const link = 'https://a.com';

  it('expands to cover the whole link, not the character clicked', () => {
    const doc = docOf(para('b1', run('go '), run('to the site', { link })));
    expect(linkRangeAt(doc, at('b1', 7))).toEqual({
      href: link,
      selection: range(['b1', 3], ['b1', 14]),
    });
  });

  it('merges children that share an href', () => {
    const doc = docOf(para('b1', run('ab', { link }), run('cd', { link, bold: true })));
    expect(linkRangeAt(doc, at('b1', 1))?.selection).toEqual(range(['b1', 0], ['b1', 4]));
  });

  it('stops at a different href', () => {
    const doc = docOf(
      para('b1', run('ab', { link }), run('cd', { link: 'https://b.com' })),
    );
    expect(linkRangeAt(doc, at('b1', 1))?.selection).toEqual(range(['b1', 0], ['b1', 2]));
  });

  it('returns null when the position is not in a link', () => {
    expect(linkRangeAt(docOf(para('b1', run('plain'))), at('b1', 2))).toBeNull();
  });

  it('returns null for a block that does not exist', () => {
    expect(linkRangeAt(docOf(para('b1', run('x', { link }))), at('gone', 0))).toBeNull();
  });
});
