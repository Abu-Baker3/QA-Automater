import { describe, expect, it } from 'vitest';
import { cn } from '@qa-automater/ui';

describe('web app utilities', () => {
  it('uses shared ui package', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });
});
