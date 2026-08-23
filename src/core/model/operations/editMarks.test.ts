import { describe, expect, it } from 'vitest';
import { caret, docOf, para, range, run } from '../../test-builders';
import { setLink, toggleMark, togglePendingMark } from './editMarks';

describe('toggleMark', () => {
  it('marks an unmarked range', () => {
    const doc = docOf(para('b1', run('Hello')));
    const out = toggleMark(doc, range(['b1', 0], ['b1', 2]), 'bold');
    expect(out.doc.blocks[0]!.children).toEqual([run('He', { bold: true }), run('llo')]);
  });

  it('unmarks a fully marked range', () => {
    const doc = docOf(para('b1', run('Hello', { bold: true })));
    const out = toggleMark(doc, range(['b1', 0], ['b1', 5]), 'bold');
    expect(out.doc.blocks[0]!.children).toEqual([run('Hello')]);
  });

  it('marks the whole range when it is only partly marked', () => {
    const doc = docOf(para('b1', run('He', { bold: true }), run('llo')));
    const out = toggleMark(doc, range(['b1', 0], ['b1', 5]), 'bold');
    expect(out.doc.blocks[0]!.children).toEqual([run('Hello', { bold: true })]);
  });

  it('merges with neighbouring marked text', () => {
    const doc = docOf(para('b1', run('ab', { bold: true }), run('cd')));
    const out = toggleMark(doc, range(['b1', 2], ['b1', 4]), 'bold');
    expect(out.doc.blocks[0]!.children).toEqual([run('abcd', { bold: true })]);
  });

  it('leaves other marks alone', () => {
    const doc = docOf(para('b1', run('ab', { italic: true })));
    const out = toggleMark(doc, range(['b1', 0], ['b1', 2]), 'bold');
    expect(out.doc.blocks[0]!.children).toEqual([run('ab', { italic: true, bold: true })]);
  });

  it('spans blocks', () => {
    const doc = docOf(para('b1', run('one')), para('b2', run('two')));
    const out = toggleMark(doc, range(['b1', 1], ['b2', 2]), 'bold');
    expect(out.doc.blocks[0]!.children).toEqual([run('o'), run('ne', { bold: true })]);
    expect(out.doc.blocks[1]!.children).toEqual([run('tw', { bold: true }), run('o')]);
  });

  it('does nothing when collapsed', () => {
    const doc = docOf(para('b1', run('Hello')));
    expect(toggleMark(doc, caret('b1', 2), 'bold').doc).toBe(doc);
  });
});

describe('setLink', () => {
  it('applies a link to a range', () => {
    const doc = docOf(para('b1', run('Hello')));
    const out = setLink(doc, range(['b1', 0], ['b1', 2]), 'https://a.com');
    expect(out.doc.blocks[0]!.children).toEqual([
      run('He', { link: 'https://a.com' }),
      run('llo'),
    ]);
  });

  it('replaces an existing href rather than nesting', () => {
    const doc = docOf(para('b1', run('Hello', { link: 'https://a.com' })));
    const out = setLink(doc, range(['b1', 0], ['b1', 5]), 'https://b.com');
    expect(out.doc.blocks[0]!.children).toEqual([run('Hello', { link: 'https://b.com' })]);
  });

  it('removes a link with null', () => {
    const doc = docOf(para('b1', run('Hello', { link: 'https://a.com' })));
    const out = setLink(doc, range(['b1', 0], ['b1', 5]), null);
    expect(out.doc.blocks[0]!.children).toEqual([run('Hello')]);
  });

  it('keeps neighbouring links separate when the hrefs differ', () => {
    const doc = docOf(para('b1', run('ab', { link: 'https://a.com' }), run('cd')));
    const out = setLink(doc, range(['b1', 2], ['b1', 4]), 'https://b.com');
    expect(out.doc.blocks[0]!.children).toHaveLength(2);
  });

  it('does nothing when collapsed', () => {
    const doc = docOf(para('b1', run('Hello')));
    expect(setLink(doc, caret('b1', 2), 'https://a.com').doc).toBe(doc);
  });
});

describe('togglePendingMark', () => {
  const plain = docOf(para('b1', run('Hello')));

  it('starts from the marks already at the caret', () => {
    const bolded = docOf(para('b1', run('Hello', { bold: true })));
    expect(togglePendingMark(bolded, caret('b1', 2), null, 'bold')).toEqual({});
  });

  it('adds a mark when nothing is pending', () => {
    expect(togglePendingMark(plain, caret('b1', 2), null, 'bold')).toEqual({ bold: true });
  });

  it('toggles off an already pending mark', () => {
    expect(togglePendingMark(plain, caret('b1', 2), { bold: true }, 'bold')).toEqual({});
  });

  it('keeps other pending marks', () => {
    expect(togglePendingMark(plain, caret('b1', 2), { italic: true }, 'bold')).toEqual({
      italic: true,
      bold: true,
    });
  });
});
