import type { PromptEvalOptions, PromptEvalResult } from '@qa-automater/types';

export class PromptRegressionException extends Error {
  readonly baselinePrecision: number;
  readonly candidatePrecision: number;
  readonly precisionDelta: number;
  readonly maxDrop: number;

  constructor(baselinePrecision: number, candidatePrecision: number, maxDrop: number) {
    const dropPercent = ((baselinePrecision - candidatePrecision) * 100).toFixed(2);
    const maxDropPercent = (maxDrop * 100).toFixed(2);
    super(
      `PROMPT REGRESSION BLOCKED DEPLOYMENT: Precision dropped by ${dropPercent}% (from ${(baselinePrecision * 100).toFixed(2)}% to ${(candidatePrecision * 100).toFixed(2)}%), exceeding the maximum allowed threshold of ${maxDropPercent}%.`,
    );
    this.name = 'PromptRegressionException';
    this.baselinePrecision = baselinePrecision;
    this.candidatePrecision = candidatePrecision;
    this.precisionDelta = baselinePrecision - candidatePrecision;
    this.maxDrop = maxDrop;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PromptEvalHarness {
  /**
   * Evaluates precision delta between baseline and updated prompt.
   * AC2: Blocks deploy if precision drops > 5% (0.05).
   */
  static evaluatePromptPrecision(
    baselinePrecision: number,
    candidatePrecision: number,
    options?: PromptEvalOptions,
  ): PromptEvalResult {
    const maxDrop = options?.max_precision_drop ?? 0.05;
    const precisionDelta = baselinePrecision - candidatePrecision;
    const dropPercent = precisionDelta * 100;
    const isBlocked = precisionDelta > maxDrop;

    const result: PromptEvalResult = {
      eval_run_id: `eval_${Date.now()}`,
      prompt_version: 'v1.0.1-candidate',
      prompt_hash: 'sha256:eval_candidate_hash',
      total_samples: 100,
      precision: candidatePrecision,
      baseline_precision: baselinePrecision,
      precision_delta: precisionDelta,
      deploy_blocked: isBlocked,
      block_reason: isBlocked
        ? `Precision dropped by ${dropPercent.toFixed(2)}%, exceeding max allowed threshold of ${(maxDrop * 100).toFixed(2)}%.`
        : undefined,
      timestamp: new Date().toISOString(),
    };

    if (isBlocked) {
      throw new PromptRegressionException(baselinePrecision, candidatePrecision, maxDrop);
    }

    return result;
  }
}
