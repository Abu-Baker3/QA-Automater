import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  ElementSearchResultItem,
  StepLocatorMapping,
  TestPlanStep,
} from '@qa-automater/types';
import { MappingAgentController } from './mapping-agent.controller';
import { MappingAgentService } from './mapping-agent.service';

const sampleStep: TestPlanStep = {
  step_id: 'step_email_101',
  action: 'fill',
  target_description: 'Email Address input on login page',
  value: 'test@example.com',
  expected_outcome: 'Email entered',
  page_hint: '/login',
};

const candidatePool: ElementSearchResultItem[] = [
  {
    id: 'elem_email_101',
    scan_id: 'scan_100',
    repository_id: 'repo_main',
    route_path: '/login',
    tag_name: 'input',
    text_content: 'Email Address',
    source_ref: 'app/login/page.tsx:24',
    stability_tier: 'high',
    relevance_score: 0.95,
    primary_candidate: {
      strategy: 'label',
      value: 'Email Address',
      score: 0.92,
      playwright_code: "page.getByLabel('Email Address')",
      rank: 1,
      stability_tier: 'high',
    },
    candidates: [],
  },
];

const mockMappingResult: StepLocatorMapping = {
  step_id: 'step_email_101',
  element_id: 'elem_email_101',
  chosen_locator: {
    strategy: 'label',
    value: 'Email Address',
    score: 0.92,
    playwright_code: "page.getByLabel('Email Address')",
    rank: 1,
    stability_tier: 'high',
  },
  confidence: 0.95,
  rationale: 'Mapped to Email Address input in app/login/page.tsx:24',
  needs_review: false,
  source_ref: 'app/login/page.tsx:24',
};

describe('MappingAgentController (E9.4)', () => {
  let controller: MappingAgentController;
  let service: MappingAgentService;

  beforeEach(() => {
    service = {
      mapStepToElement: vi.fn().mockResolvedValue({
        mapping: mockMappingResult,
        attempts: 1,
        status: 'success',
      }),
    } as unknown as MappingAgentService;

    controller = new MappingAgentController(service);
  });

  it('POST /stories/map-step returns mapped locator with confidence & rationale', async () => {
    const result = await controller.mapStep({
      step: sampleStep,
      candidates: candidatePool,
    });

    expect(result.status).toBe('success');
    expect(result.mapping.element_id).toBe('elem_email_101');
    expect(result.mapping.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.mapping.needs_review).toBe(false);
    expect(result.mapping.rationale).toContain('app/login/page.tsx:24');
    expect(service.mapStepToElement).toHaveBeenCalledWith(sampleStep, candidatePool);
  });

  it('POST /stories/map-step throws UnprocessableEntityException when MappingAgentException is thrown', async () => {
    const { MappingAgentException } = await import('@qa-automater/shared');
    const { UnprocessableEntityException } = await import('@nestjs/common');

    (service.mapStepToElement as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new MappingAgentException('Failed to map step after 3 attempts', 'step_email_101', 3),
    );

    await expect(
      controller.mapStep({
        step: sampleStep,
        candidates: candidatePool,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('POST /stories/map-step throws BadRequestException when step is missing or invalid', async () => {
    const { BadRequestException } = await import('@nestjs/common');
    const realService = new MappingAgentService({} as any);
    await expect(realService.mapStepToElement(null as any, candidatePool)).rejects.toThrow(
      BadRequestException,
    );
  });
});
