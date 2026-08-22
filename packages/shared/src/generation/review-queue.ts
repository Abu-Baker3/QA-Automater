import type {
  ElementSearchResultItem,
  ReviewItem,
  StepLocatorMapping,
  TestPlanIR,
} from '@qa-automater/types';

/**
 * Builds review items list for human-in-the-loop QA evaluation.
 * AC1: Lists step_order, confidence, candidates, rationale for low-confidence or unmapped steps.
 */
export function buildReviewItems(
  testPlanIr?: TestPlanIR,
  mappings?: StepLocatorMapping[],
  candidatesMap?: Record<string, ElementSearchResultItem[]>,
): ReviewItem[] {
  if (!testPlanIr?.steps || !mappings || mappings.length === 0) {
    return [];
  }

  const reviewItems: ReviewItem[] = [];

  testPlanIr.steps.forEach((step, index) => {
    const stepOrder = index + 1;
    const mapping = mappings.find((m) => m.step_id === step.step_id) || mappings[index];

    if (!mapping) return;

    const candidates = mapping.candidates || (candidatesMap && candidatesMap[step.step_id]) || [];

    const isHumanVerified = Boolean(mapping.human_verified);

    reviewItems.push({
      step_id: step.step_id,
      step_order: stepOrder,
      action: step.action,
      target_description: step.target_description,
      confidence: mapping.confidence,
      element_id: mapping.element_id,
      chosen_locator: mapping.chosen_locator,
      candidates,
      rationale: mapping.rationale,
      needs_review: mapping.needs_review || mapping.confidence < 0.85 || !mapping.element_id,
      human_verified: isHumanVerified,
    });
  });

  return reviewItems;
}

/**
 * Evaluates whether export is allowed for a test plan generation job.
 * AC2: Given all mappings >= 0.85 or human_verified when checked then export allowed.
 */
export function isExportAllowed(mappings?: StepLocatorMapping[]): boolean {
  if (!mappings || mappings.length === 0) {
    return false;
  }

  return mappings.every((m) => {
    const isHighConfidence = typeof m.confidence === 'number' && m.confidence >= 0.85;
    const isHumanVerified = Boolean(m.human_verified);
    const hasElementId = Boolean(m.element_id);

    return (isHighConfidence || isHumanVerified) && hasElementId;
  });
}
