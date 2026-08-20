import { describe, expect, it, vi } from 'vitest';
import type {
  ElementSearchResultItem,
  StepLocatorMapping,
  TestPlanStep,
} from '@qa-automater/types';
import {
  ILLMProvider,
  MappingAgent,
  MappingAgentException,
  validateStepLocatorMapping,
} from './index';

const sampleStep: TestPlanStep = {
  step_id: 'step_login_email',
  action: 'fill',
  target_description: 'Email input field on login page',
  value: 'user@example.com',
  expected_outcome: 'Email typed into field',
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
    candidates: [
      {
        strategy: 'label',
        value: 'Email Address',
        score: 0.92,
        playwright_code: "page.getByLabel('Email Address')",
        rank: 1,
        stability_tier: 'high',
      },
    ],
  },
  {
    id: 'elem_password_102',
    scan_id: 'scan_100',
    repository_id: 'repo_main',
    route_path: '/login',
    tag_name: 'input',
    text_content: 'Password',
    source_ref: 'app/login/page.tsx:32',
    stability_tier: 'high',
    relevance_score: 0.85,
    primary_candidate: {
      strategy: 'label',
      value: 'Password',
      score: 0.92,
      playwright_code: "page.getByLabel('Password')",
      rank: 1,
      stability_tier: 'high',
    },
    candidates: [],
  },
];

const validMappingHighConfidence: StepLocatorMapping = {
  step_id: 'step_login_email',
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
  rationale: 'Mapped to Email Address label input in app/login/page.tsx:24',
  needs_review: false,
  source_ref: 'app/login/page.tsx:24',
};

describe('MappingAgent (E9.4)', () => {
  it('AC1: validateStepLocatorMapping rejects element_id not present in candidate list', () => {
    const offListMapping: StepLocatorMapping = {
      ...validMappingHighConfidence,
      element_id: 'elem_off_list_999', // Not in candidatePool
    };

    expect(validateStepLocatorMapping(offListMapping, candidatePool)).toBe(false);
    expect(validateStepLocatorMapping(validMappingHighConfidence, candidatePool)).toBe(true);
  });

  it('AC2: validateStepLocatorMapping requires needs_review=true when confidence < 0.85', () => {
    const lowConfidenceUnflagged: StepLocatorMapping = {
      ...validMappingHighConfidence,
      confidence: 0.75,
      needs_review: false, // Invalid according to AC2
    };

    const lowConfidenceFlagged: StepLocatorMapping = {
      ...validMappingHighConfidence,
      confidence: 0.75,
      needs_review: true, // Valid according to AC2
    };

    expect(validateStepLocatorMapping(lowConfidenceUnflagged, candidatePool)).toBe(false);
    expect(validateStepLocatorMapping(lowConfidenceFlagged, candidatePool)).toBe(true);
  });

  it('AC3: validateStepLocatorMapping requires rationale to cite source_ref when confidence >= 0.5', () => {
    const uncitedRationale: StepLocatorMapping = {
      ...validMappingHighConfidence,
      confidence: 0.9,
      rationale: 'Mapped to input field without citing file location', // missing app/login/page.tsx:24
    };

    expect(validateStepLocatorMapping(uncitedRationale, candidatePool)).toBe(false);
  });

  it('rejects NaN confidence values in validateStepLocatorMapping', () => {
    const nanConfidenceMapping: StepLocatorMapping = {
      ...validMappingHighConfidence,
      confidence: NaN,
    };

    expect(validateStepLocatorMapping(nanConfidenceMapping, candidatePool)).toBe(false);
  });

  it('enforces needs_review=true for unmapped steps (element_id: null) regardless of confidence', async () => {
    const unmappedHighConfidence: StepLocatorMapping = {
      step_id: 'step_unmapped_101',
      element_id: null,
      chosen_locator: null,
      confidence: 0.95,
      rationale: 'No candidate element matched step',
      needs_review: false,
    };

    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: vi.fn().mockResolvedValue({
        data: unmappedHighConfidence,
        rawText: JSON.stringify(unmappedHighConfidence),
        provider: 'openai',
        model: 'gpt-4o',
      }),
    };

    const agent = new MappingAgent(mockProvider);
    const result = await agent.mapStepToElement(sampleStep, candidatePool);

    expect(result.status).toBe('success');
    expect(result.mapping.needs_review).toBe(true);
  });

  it('maps step to element and enforces needs_review=true for low confidence', async () => {
    const lowConfMapping: StepLocatorMapping = {
      ...validMappingHighConfidence,
      confidence: 0.7,
      needs_review: true,
      rationale: 'Mapped with medium confidence app/login/page.tsx:24',
    };

    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: vi.fn().mockResolvedValue({
        data: lowConfMapping,
        rawText: JSON.stringify(lowConfMapping),
        provider: 'openai',
        model: 'gpt-4o',
      }),
    };

    const agent = new MappingAgent(mockProvider);
    const result = await agent.mapStepToElement(sampleStep, candidatePool);

    expect(result.status).toBe('success');
    expect(result.mapping.needs_review).toBe(true);
    expect(result.mapping.element_id).toBe('elem_email_101');
    expect(result.mapping.source_ref).toBe('app/login/page.tsx:24');
  });

  it('retries up to 2 times on validation error and succeeds on retry', async () => {
    const invalidMapping: StepLocatorMapping = {
      ...validMappingHighConfidence,
      element_id: 'elem_invalid_999',
    };

    const mockCompleteStructured = vi
      .fn()
      .mockResolvedValueOnce({
        data: invalidMapping,
        rawText: JSON.stringify(invalidMapping),
        provider: 'openai',
        model: 'gpt-4o',
      })
      .mockResolvedValueOnce({
        data: validMappingHighConfidence,
        rawText: JSON.stringify(validMappingHighConfidence),
        provider: 'openai',
        model: 'gpt-4o',
      });

    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: mockCompleteStructured,
    };

    const agent = new MappingAgent(mockProvider);
    const result = await agent.mapStepToElement(sampleStep, candidatePool, 2);

    expect(result.status).toBe('success');
    expect(result.attempts).toBe(2);
    expect(mockCompleteStructured).toHaveBeenCalledTimes(2);

    const retryPrompt = mockCompleteStructured.mock.calls[1]?.[0]?.userPrompt;
    expect(retryPrompt).toContain('CRITICAL RETRY NOTICE (Attempt 2/3)');
  });

  it('throws MappingAgentException after 3 failed attempts if LLM output remains invalid', async () => {
    const invalidMapping: StepLocatorMapping = {
      ...validMappingHighConfidence,
      element_id: 'elem_invalid_999',
    };

    const mockCompleteStructured = vi.fn().mockResolvedValue({
      data: invalidMapping,
      rawText: JSON.stringify(invalidMapping),
      provider: 'openai',
      model: 'gpt-4o',
    });

    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: mockCompleteStructured,
    };

    const agent = new MappingAgent(mockProvider);
    await expect(agent.mapStepToElement(sampleStep, candidatePool, 2)).rejects.toThrow(
      MappingAgentException,
    );

    expect(mockCompleteStructured).toHaveBeenCalledTimes(3);
  });
});
