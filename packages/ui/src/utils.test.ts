import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('@qa-automater/ui', () => {
  it('cn merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
    expect(cn('a', false, undefined, 'c')).toBe('a c');
  });
});
