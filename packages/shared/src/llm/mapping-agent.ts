import type {
  ElementSearchResultItem,
  LLMJsonSchema,
  MappingAgentResult,
  StepLocatorMapping,
  TestPlanStep,
} from '@qa-automater/types';

import { incrementCounter, recordHistogram, withSpan } from '../telemetry';
import { ILLMProvider } from './types';

export class MappingAgentException extends Error {
  readonly stepId: string;
  readonly attempts: number;

  constructor(message: string, stepId: string, attempts: number) {
    super(message);
    this.name = 'MappingAgentException';
    this.stepId = stepId;
    this.attempts = attempts;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validates mapped step locator payload against AC1 (element_id in candidates), AC2 (confidence < 0.85 -> needs_review: true),
 * and AC3 (confidence >= 0.5 -> rationale cites source_ref).
 */
export function validateStepLocatorMapping(
  data: unknown,
  candidates: ElementSearchResultItem[],
): data is StepLocatorMapping {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const obj = data as Record<string, unknown>;

  if (
    typeof obj.step_id !== 'string' ||
    typeof obj.confidence !== 'number' ||
    typeof obj.rationale !== 'string' ||
    typeof obj.needs_review !== 'boolean'
  ) {
    return false;
  }

  if (Number.isNaN(obj.confidence) || obj.confidence < 0 || obj.confidence > 1) {
    return false;
  }

  // AC1: element_id chosen ONLY from candidate list (or null)
  const candidateIds = new Set(candidates.map((c) => c.id));
  if (obj.element_id !== null && typeof obj.element_id === 'string') {
    if (!candidateIds.has(obj.element_id)) {
      return false;
    }
  } else if (obj.element_id !== null) {
    return false;
  }

  // AC2: Given mapping complete When confidence < 0.85 Then step flagged for review (needs_review: true)
  if (obj.confidence < 0.85 && !obj.needs_review) {
    return false;
  }

  // AC3: Given every mapping When confidence >= 0.5 Then rationale cites source_ref
  if (obj.confidence >= 0.5 && obj.element_id !== null) {
    const matchedElement = candidates.find((c) => c.id === obj.element_id);
    const sourceRef = matchedElement?.source_ref || obj.source_ref;
    if (sourceRef && typeof sourceRef === 'string') {
      const rationaleLower = obj.rationale.toLowerCase();
      const sourceLower = sourceRef.toLowerCase();
      // Must reference source file/line or the source_ref string directly in rationale
      const hasCitation =
        rationaleLower.includes(sourceLower) ||
        sourceLower.split('/').some((part) => part.length > 3 && rationaleLower.includes(part));
      if (!hasCitation) {
        return false;
      }
    }
  }

  return true;
}

export const TestPlanMappingSchema: LLMJsonSchema<StepLocatorMapping> = {
  name: 'StepLocatorMappingSchema',
  description: 'Schema for mapping a Test Plan IR step to a candidate UI element',
  schema: {
    type: 'object',
    properties: {
      step_id: { type: 'string' },
      element_id: { type: ['string', 'null'] },
      chosen_locator: {
        type: ['object', 'null'],
        properties: {
          strategy: { type: 'string' },
          value: { type: 'string' },
          score: { type: 'number' },
          playwright_code: { type: 'string' },
          rank: { type: 'number' },
          stability_tier: { type: 'string' },
        },
        required: ['strategy', 'value', 'score', 'playwright_code', 'rank', 'stability_tier'],
      },
      confidence: { type: 'number' },
      rationale: { type: 'string' },
      needs_review: { type: 'boolean' },
      source_ref: { type: 'string' },
    },
    required: [
      'step_id',
      'element_id',
      'chosen_locator',
      'confidence',
      'rationale',
      'needs_review',
    ],
  },
  validator: (data) => validateStepLocatorMapping(data, []),
};

export class MappingAgent {
  private readonly provider: ILLMProvider;

  constructor(provider: ILLMProvider) {
    this.provider = provider;
  }

  /**
   * Maps a test step to the best candidate element using LLM reasoning & confidence scoring.
   * - AC1: element_id chosen ONLY from candidate list.
   * - AC2: confidence < 0.85 flags step for review (needs_review = true).
   * - AC3: confidence >= 0.5 requires rationale to cite source_ref.
   */
  async mapStepToElement(
    step: TestPlanStep,
    candidates: ElementSearchResultItem[],
    maxRetries = 2,
  ): Promise<MappingAgentResult> {
    const startTime = Date.now();
    const maxAttempts = Math.max(1, maxRetries + 1);

    return withSpan('mapping_agent.mapStepToElement', 'mapStepToElement', async (span) => {
      span.setAttribute('step.id', step.step_id);
      span.setAttribute('step.action', step.action);
      span.setAttribute('candidates.count', candidates.length);

      const candidateSummary = candidates
        .map((c, i) => {
          const locatorsStr =
            c.candidates?.map((l) => `${l.strategy}: "${l.value}"`).join(', ') ||
            `${c.primary_candidate?.strategy}: "${c.primary_candidate?.value}"`;
          return `${i + 1}. element_id: "${c.id}" | tag: "${c.tag_name}" | text: "${
            c.text_content || ''
          }" | route: "${c.route_path || ''}" | source_ref: "${c.source_ref || ''}" | locators: [${locatorsStr}]`;
        })
        .join('\n');

      let lastError = '';

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const systemPrompt = `You are a QA Mapping Agent. Map a test plan step to the best matching UI element candidate.
Output JSON matching StepLocatorMappingSchema.

CRITICAL CONSTRAINTS:
1. You MUST choose element_id ONLY from the provided Candidate List (or null if no candidate fits).
2. Set confidence to a float between 0.0 and 1.0.
3. If confidence < 0.85, set needs_review to true.
4. If confidence >= 0.5 and element_id is chosen, rationale MUST explicitly cite the candidate's source_ref (e.g., "Mapped to input in app/login/page.tsx:24").
5. Pick chosen_locator from candidate locators (prefer testid > role_name > label > placeholder).`;

        let userPrompt = `Test Step ID: ${step.step_id}
Action: ${step.action}
Target Description: ${step.target_description}
Expected Outcome: ${step.expected_outcome}
Page Hint: ${step.page_hint || 'None'}

Candidate List:
${candidateSummary || 'No candidates found.'}`;

        if (attempt > 1) {
          userPrompt += `\n\nCRITICAL RETRY NOTICE (Attempt ${attempt}/${maxAttempts}): Previous attempt failed validation: "${lastError}". You MUST select element_id from candidate list only, set needs_review=true if confidence < 0.85, and cite source_ref in rationale when confidence >= 0.5.`;
        }

        try {
          const response = await this.provider.completeStructured(
            {
              systemPrompt,
              userPrompt,
              temperature: 0.1,
            },
            {
              ...TestPlanMappingSchema,
              validator: (data) => validateStepLocatorMapping(data, candidates),
            },
          );

          if (!validateStepLocatorMapping(response.data, candidates)) {
            throw new Error(
              `Step locator mapping fails constraints: element_id must be in candidate list, needs_review must be true if confidence < 0.85, and rationale must cite source_ref if confidence >= 0.5`,
            );
          }

          const mapping = response.data;

          const matchedElement = candidates.find((c) => c.id === mapping.element_id);
          const sourceRef = matchedElement?.source_ref || mapping.source_ref;

          // Rule engine post-enforcement for AC2 & AC3 (unmapped steps or low confidence flag needs_review)
          const needsReview =
            mapping.element_id === null || mapping.confidence < 0.85 ? true : mapping.needs_review;

          let rationale = mapping.rationale;
          if (
            mapping.confidence >= 0.5 &&
            sourceRef &&
            !rationale.toLowerCase().includes(sourceRef.toLowerCase())
          ) {
            rationale += ` (Source: ${sourceRef})`;
          }

          const finalMapping: StepLocatorMapping = {
            ...mapping,
            needs_review: needsReview,
            rationale,
            source_ref: sourceRef,
            chosen_locator: mapping.chosen_locator || matchedElement?.primary_candidate || null,
          };

          const durationMs = Date.now() - startTime;
          recordHistogram('mapping_agent', 'mapping.duration_ms', durationMs);
          incrementCounter('mapping_agent', 'mapping.success', 1, {
            attempts: String(attempt),
            needs_review: String(needsReview),
          });

          return {
            mapping: finalMapping,
            attempts: attempt,
            status: 'success',
          };
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          incrementCounter('mapping_agent', 'mapping.attempt_failed', 1, {
            attempt: String(attempt),
          });

          console.warn(
            `[Mapping Agent] Mapping attempt ${attempt}/${maxAttempts} failed for step '${step.step_id}': ${lastError}`,
          );

          if (attempt === maxAttempts) {
            incrementCounter('mapping_agent', 'mapping.failed', 1);
            throw new MappingAgentException(
              `Mapping Agent failed to map step '${step.step_id}' after ${maxAttempts} attempts: ${lastError}`,
              step.step_id,
              maxAttempts,
            );
          }
        }
      }

      throw new MappingAgentException(
        `Mapping Agent failed to map step '${step.step_id}'`,
        step.step_id,
        maxAttempts,
      );
    });
  }
}
