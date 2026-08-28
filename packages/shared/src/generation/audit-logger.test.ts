import { describe, expect, it } from 'vitest';
import {
  buildGenerationAuditLog,
  buildSourceRefChain,
  verifyTraceabilityChain,
} from './audit-logger';

describe('AuditLogger (E12.4)', () => {
  it('AC1: builds generation audit log including story_text, mappings, model_versions, export_timestamp, user_id', () => {
    const auditLog = buildGenerationAuditLog({
      jobId: 'job_101',
      storyId: 'story_authentication',
      userId: 'usr_qa_lead_1',
      exportType: 'zip',
      storyText: 'User wants to log in securely with MFA',
      mappings: [
        {
          step_id: 'step_1',
          step_order: 1,
          element_id: 'elem_email_input',
          chosen_locator: {
            strategy: 'css',
            value: '#email',
            score: 0.95,
            playwright_code: "page.locator('#email')",
            rank: 1,
            stability_tier: 'high',
          },
          confidence: 0.95,
          rationale: 'Exact ID match',
          needs_review: false,
          source_ref: 'apps/web/src/components/LoginForm.tsx:42',
        },
      ],
    });

    expect(auditLog.job_id).toBe('job_101');
    expect(auditLog.story_id).toBe('story_authentication');
    expect(auditLog.user_id).toBe('usr_qa_lead_1');
    expect(auditLog.export_type).toBe('zip');
    expect(auditLog.story_text).toContain('User wants to log in');
    expect(auditLog.mappings).toHaveLength(1);
    expect(auditLog.model_versions.story_agent).toBeDefined();
    expect(auditLog.export_timestamp).toBeDefined();
  });

  it('AC2: constructs intact source_ref chain story -> step -> locator -> file:line', () => {
    const chain = buildSourceRefChain(
      {
        user_story_id: 'story_checkout',
        title: 'Checkout Payment Flow',
        summary: 'Verify checkout with credit card',
        steps: [
          {
            step_id: 'step_1',
            action: 'click',
            target_description: 'Click Pay Now',
            expected_outcome: 'Payment processed',
          },
        ],
      },
      [
        {
          step_id: 'step_1',
          step_order: 1,
          element_id: 'btn_pay_now',
          chosen_locator: {
            strategy: 'css',
            value: 'button[data-testid="pay-now"]',
            score: 0.98,
            playwright_code: 'page.locator(\'button[data-testid="pay-now"]\')',
            rank: 1,
            stability_tier: 'high',
          },
          confidence: 0.98,
          rationale: 'Data-testid match',
          needs_review: false,
          source_ref: 'apps/web/src/pages/Checkout.tsx:108',
        },
      ],
      'story_checkout',
    );

    expect(chain).toHaveLength(1);
    expect(chain[0]?.story_id).toBe('story_checkout');
    expect(chain[0]?.step_id).toBe('step_1');
    expect(chain[0]?.locator_id).toBe('btn_pay_now');
    expect(chain[0]?.file_path).toBe('apps/web/src/pages/Checkout.tsx');
    expect(chain[0]?.line_number).toBe(108);
    expect(chain[0]?.source_ref).toBe(
      'story:story_checkout -> step:1 (click) -> locator:btn_pay_now (button[data-testid="pay-now"]) -> file:apps/web/src/pages/Checkout.tsx:108',
    );
  });

  it('AC2: verifies traceability chain compliance integrity', () => {
    const auditLog = buildGenerationAuditLog({
      jobId: 'job_202',
      storyId: 'story_compliance',
    });

    const isIntact = verifyTraceabilityChain(auditLog);
    expect(isIntact).toBe(true);
  });
});
