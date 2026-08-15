import { describe, it, expect } from 'vitest';
import { ElementsController } from './elements.controller';
import { NotFoundException } from '@nestjs/common';

describe('ElementsController (E6.4 AC2)', () => {
  const controller = new ElementsController();

  it('should return element detail with source_ref as {file}:{line}', async () => {
    const result = await controller.getElementDetail('elem_101');

    expect(result).toBeDefined();
    expect(result.id).toBe('elem_101');
    expect(result.source_file).toBe('app/login/page.tsx');
    expect(result.source_line).toBe(42);
    expect(result.source_ref).toBe('app/login/page.tsx:42');
    expect(result.source_ref).toMatch(/^.+:\d+$/);
  });

  it('should throw NotFoundException if element id is not found', async () => {
    await expect(controller.getElementDetail('not_found')).rejects.toThrow(NotFoundException);
  });
});
