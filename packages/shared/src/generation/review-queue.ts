import type {
  ElementSearchResultItem,
  GenerationJob,
  OverrideMappingRequest,
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

/**
 * Applies human override to a specific step mapping by step_order.
 * AC1: Sets confidence = 1.0, human_verified = true, needs_review = false.
 * AC2: When all mappings pass, sets export_allowed = true and status = 'codegen'.
 */
export function applyMappingOverride(
  job: GenerationJob,
  stepOrder: number,
  override: OverrideMappingRequest,
): GenerationJob {
  if (!job.mappings || job.mappings.length === 0) {
    throw new Error(`Cannot override mapping on job '${job.id}': no mappings present`);
  }

  const targetMappingIndex = job.mappings.findIndex(
    (m, idx) => m.step_order === stepOrder || idx === stepOrder - 1,
  );

  if (targetMappingIndex === -1) {
    throw new Error(
      `Step order ${stepOrder} out of bounds for job '${job.id}' (has ${job.mappings.length} steps)`,
    );
  }

  const existingMapping = job.mappings[targetMappingIndex];
  if (!existingMapping) {
    throw new Error(`Step order ${stepOrder} not found in job '${job.id}'`);
  }

  const updatedElementId =
    override.element_id !== undefined ? override.element_id : existingMapping.element_id;

  let updatedChosenLocator = override.chosen_locator;
  if (!updatedChosenLocator && updatedElementId && existingMapping.candidates) {
    const candidateElem = existingMapping.candidates.find((c) => c.id === updatedElementId);
    if (candidateElem) {
      updatedChosenLocator = candidateElem.primary_candidate;
    }
  }
  if (!updatedChosenLocator) {
    updatedChosenLocator = existingMapping.chosen_locator;
  }

  const updatedMapping: StepLocatorMapping = {
    ...existingMapping,
    element_id: updatedElementId,
    chosen_locator: updatedChosenLocator,
    confidence: 1.0,
    human_verified: true,
    needs_review: false,
    rationale: override.rationale || 'Human override verified by QA Engineer',
  };

  const updatedMappings = [...job.mappings];
  updatedMappings[targetMappingIndex] = updatedMapping;

  const reviewItems = buildReviewItems(job.test_plan_ir, updatedMappings);
  const exportAllowed = isExportAllowed(updatedMappings);

  let status = job.status;
  if (exportAllowed && status === 'review') {
    status = 'codegen';
  }

  return {
    ...job,
    status,
    mappings: updatedMappings,
    review_items: reviewItems,
    export_allowed: exportAllowed,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Returns pending review items that require human resolution before export.
 * E10.3 AC1: Filters steps where needs_review is true or confidence < 0.85 and human_verified is false.
 */
export function getPendingReviewItems(job: GenerationJob): ReviewItem[] {
  const reviewItems = job.review_items || buildReviewItems(job.test_plan_ir, job.mappings);
  return reviewItems.filter(
    (item) =>
      item.needs_review || (item.confidence < 0.85 && !item.human_verified) || !item.element_id,
  );
}

/**
 * Exception thrown when export is blocked due to unresolved step locator mappings.
 */
export class ExportBlockedException extends Error {
  readonly code = 'EXPORT_BLOCKED_UNRESOLVED_REVIEW_ITEMS';
  readonly pending_steps: ReviewItem[];

  constructor(pendingSteps: ReviewItem[]) {
    super(
      `Export blocked: ${pendingSteps.length} step locator mapping(s) require human review resolution before export.`,
    );
    this.name = 'ExportBlockedException';
    this.pending_steps = pendingSteps;
  }
}

/**
 * Asserts export is allowed for a job. Throws an error with pending_steps if blocked.
 * E10.3 AC1: Given unresolved review items When export requested Then throws error with pending steps.
 */
export function assertExportAllowed(job: GenerationJob): void {
  const pendingSteps = getPendingReviewItems(job);
  if (pendingSteps.length > 0 || !job.export_allowed) {
    throw new ExportBlockedException(pendingSteps);
  }
}
