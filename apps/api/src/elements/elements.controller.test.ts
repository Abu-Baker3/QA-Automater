import { describe, it, expect, beforeEach } from 'vitest';
import { ElementsController } from './elements.controller';
import { ElementsService } from './elements.service';
import { NotFoundException } from '@nestjs/common';

describe('ElementsController (E6.4 & E7.3)', () => {
  let controller: ElementsController;
  let service: ElementsService;

  beforeEach(() => {
    service = new ElementsService();
    controller = new ElementsController(service);
  });

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

  describe('E7.3: GET /elements/search', () => {
    it('AC1: Given q=email and page_route=/login, returns matching elements with locators in <2s p95', async () => {
      const res = await controller.searchElements('email', '/login');

      expect(res.data.length).toBeGreaterThan(0);
      expect(res.query_execution_time_ms).toBeLessThan(2000); // <2s p95
      expect(res.data[0]!.route_path).toBe('/login');
      expect(res.data[0]!.primary_candidate.playwright_code).toBe(
        "page.getByLabel('Email Address')",
      );
    });

    it('AC2: Given 5000 elements, search performance is within NFR target (<2s p95)', async () => {
      const res = await controller.searchElements('Synthetic', undefined, undefined, '1', '50');

      expect(res.pagination.total).toBeGreaterThanOrEqual(5000);
      expect(res.query_execution_time_ms).toBeLessThan(2000); // <2s p95
      expect(res.data.length).toBe(50);
    });
  });
});
