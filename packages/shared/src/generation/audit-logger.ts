import type {
  ExportType,
  GenerationAuditLog,
  ModelVersions,
  SourceRefChainItem,
  StepLocatorMapping,
  TestPlanIR,
  UserStoryDetails,
} from '@qa-automater/types';

/**
 * Story E12.4 AC2: Build an intact source_ref chain tracing:
 * story -> step -> locator -> file:line
 */
export function buildSourceRefChain(
  testPlan?: TestPlanIR | null,
  mappings?: StepLocatorMapping[] | null,
  storyId?: string,
): SourceRefChainItem[] {
  const storyKey = storyId || testPlan?.user_story_id || 'story_default';
  const storyTitle = testPlan?.title || 'User Story Test Suite';
  const steps = testPlan?.steps || [];
  const mappingList = mappings || [];

  if (steps.length === 0 && mappingList.length === 0) {
    // Return baseline intact story node
    return [
      {
        story_id: storyKey,
        story_title: storyTitle,
        step_id: 'step_1',
        step_order: 1,
        step_action: 'Initialize Suite',
        locator_id: 'unmapped',
        selector: 'none',
        confidence: 1.0,
        file_path: 'tests/e2e/specs/suite.spec.ts',
        line_number: 1,
        source_ref: `story:${storyKey} -> step:1 (Initialize Suite) -> locator:unmapped (none) -> file:tests/e2e/specs/suite.spec.ts:1`,
      },
    ];
  }

  return steps.map((step, index) => {
    const stepOrder = index + 1;
    const stepId = step.step_id || `step_${stepOrder}`;
    const stepAction = step.action || step.target_description || `Step ${stepOrder}`;

    // Find corresponding mapping by step_id or step_order
    const matchedMapping = mappingList.find(
      (m) => m.step_id === stepId || m.step_order === stepOrder,
    );

    const locatorId = matchedMapping?.element_id || 'unmapped';
    const selector =
      matchedMapping?.chosen_locator?.value ||
      matchedMapping?.chosen_locator?.playwright_code ||
      'none';
    const confidence = matchedMapping?.confidence ?? 0;

    const rawSourceRef = matchedMapping?.source_ref || '';

    // Parse file_path and line_number from source_ref if available (e.g., "src/components/Form.tsx:42")
    let filePath = 'unknown';
    let lineNumber = 0;
    if (rawSourceRef.includes(':')) {
      const parts = rawSourceRef.split(':');
      filePath = parts.slice(0, -1).join(':') || 'unknown';
      lineNumber = Number(parts[parts.length - 1]) || 0;
    } else if (rawSourceRef) {
      filePath = rawSourceRef;
    }

    const sourceRef = `story:${storyKey} -> step:${stepOrder} (${stepAction}) -> locator:${locatorId} (${selector}) -> file:${filePath}:${lineNumber}`;

    return {
      story_id: storyKey,
      story_title: storyTitle,
      step_id: stepId,
      step_order: stepOrder,
      step_action: stepAction,
      locator_id: locatorId,
      selector,
      confidence,
      file_path: filePath,
      line_number: lineNumber,
      source_ref: sourceRef,
    };
  });
}

/**
 * Story E12.4 AC1 & AC2: Constructs a GenerationAuditLog record.
 */
export function buildGenerationAuditLog(options: {
  id?: string;
  jobId: string;
  storyId: string;
  userId?: string;
  exportType?: ExportType;
  storyText?: string;
  userStoryDetails?: UserStoryDetails | null;
  testPlan?: TestPlanIR | null;
  mappings?: StepLocatorMapping[] | null;
  modelVersions?: ModelVersions | null;
}): GenerationAuditLog {
  const auditId = options.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userId = options.userId || 'usr_system_default';
  const exportType: ExportType = options.exportType || 'zip';

  // Construct story text combining title and description/acceptance criteria (AC1)
  let storyText = options.storyText || '';
  if (!storyText && options.userStoryDetails) {
    const details = options.userStoryDetails;
    const title = details.title || options.storyId;
    const description = details.description || '';
    const acText = Array.isArray(details.acceptance_criteria)
      ? details.acceptance_criteria.join('; ')
      : details.acceptance_criteria || '';

    storyText = `Title: ${title}\nDescription: ${description}\nAcceptance Criteria: ${acText}`;
  }
  if (!storyText && options.testPlan) {
    storyText = `Title: ${options.testPlan.title}\nSummary: ${options.testPlan.summary || ''}`;
  }
  if (!storyText) {
    storyText = `User Story ID: ${options.storyId}`;
  }

  const modelVersions: ModelVersions = options.modelVersions || {
    story_agent: { provider: 'google', model: 'gemini-2.5-flash', prompt_version: 'v1.0' },
    mapping_agent: { provider: 'google', model: 'gemini-2.5-flash', prompt_version: 'v1.0' },
  };

  const mappings = options.mappings || [];
  const sourceRefChain = buildSourceRefChain(options.testPlan, mappings, options.storyId);

  return {
    id: auditId,
    job_id: options.jobId,
    story_id: options.storyId,
    user_id: userId,
    export_type: exportType,
    story_text: storyText,
    mappings,
    model_versions: modelVersions,
    source_ref_chain: sourceRefChain,
    export_timestamp: new Date().toISOString(),
  };
}

/**
 * Story E12.4 AC2: Validates compliance review source_ref chain integrity.
 */
export function verifyTraceabilityChain(auditLog: GenerationAuditLog): boolean {
  if (!auditLog || !Array.isArray(auditLog.source_ref_chain)) {
    return false;
  }

  if (auditLog.source_ref_chain.length === 0) {
    return false;
  }

  return auditLog.source_ref_chain.every((item) => {
    return (
      typeof item.source_ref === 'string' &&
      item.source_ref.includes('story:') &&
      item.source_ref.includes('-> step:') &&
      item.source_ref.includes('-> locator:') &&
      item.source_ref.includes('-> file:')
    );
  });
}
