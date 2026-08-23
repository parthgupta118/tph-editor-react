import { describe, expect, it } from 'vitest';
import { safeHref } from './href';

describe('safeHref', () => {
  it('keeps http, https and mailto', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
    expect(safeHref('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('adds https when no protocol is given', () => {
    expect(safeHref('example.com')).toBe('https://example.com');
  });

  it('keeps fragments and relative paths as typed', () => {
    expect(safeHref('#section')).toBe('#section');
    expect(safeHref('/about')).toBe('/about');
  });

  it('rejects scripting protocols', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('JavaScript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHref('vbscript:msgbox(1)')).toBeNull();
  });

  it('rejects empty and unparseable input', () => {
    expect(safeHref('')).toBeNull();
    expect(safeHref('   ')).toBeNull();
    expect(safeHref('http://')).toBeNull();
  });

  it('trims', () => {
    expect(safeHref('  https://example.com  ')).toBe('https://example.com');
  });
});
