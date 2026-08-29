import { describe, it, expect } from 'vitest';
import { GoldenEvalHarness, GoldenEvalRegressionException } from './golden-eval-harness';
import { GOLDEN_STORIES_DATASET } from './golden-stories-dataset';

describe('AI Eval Harness — Golden Stories Gate (E14.4)', () => {
  describe('Dataset Integrity (AC1)', () => {
    it('AC1: contains 20 golden stories across 5 open-source repositories', () => {
      expect(GOLDEN_STORIES_DATASET.length).toBe(20);

      const repoIds = new Set(GOLDEN_STORIES_DATASET.map((item) => item.repo_id));
      expect(repoIds.size).toBe(5);
      expect(repoIds).toEqual(
        new Set([
          'repo_nextjs_ecommerce',
          'repo_react_admin_dashboard',
          'repo_remix_saas_starter',
          'repo_vue_todomvc',
          'repo_svelte_blog_cms',
        ]),
      );
    });

    it('each repository has exactly 4 golden stories', () => {
      const repoCounts = GOLDEN_STORIES_DATASET.reduce<Record<string, number>>((acc, item) => {
        acc[item.repo_name] = (acc[item.repo_name] || 0) + 1;
        return acc;
      }, {});

      expect(repoCounts['nextjs-e-commerce']).toBe(4);
      expect(repoCounts['react-admin-dashboard']).toBe(4);
      expect(repoCounts['remix-saas-starter']).toBe(4);
      expect(repoCounts['vue-todomvc']).toBe(4);
      expect(repoCounts['svelte-blog-cms']).toBe(4);
    });
  });

  describe('GoldenEvalHarness Execution (AC1 & AC2)', () => {
    it('AC1: evaluates 20 golden stories across 5 repos and passes when precision >= 80%', async () => {
      const summary = await GoldenEvalHarness.runEvaluation(undefined, {
        min_locator_precision: 0.8,
      });

      expect(summary.total_repos).toBe(5);
      expect(summary.total_stories).toBe(20);
      expect(summary.total_steps).toBeGreaterThanOrEqual(20);
      expect(summary.locator_precision).toBeGreaterThanOrEqual(0.8);
      expect(summary.passed).toBe(true);
      expect(summary.deploy_blocked).toBe(false);
      expect(summary.repo_breakdown.length).toBe(5);
    });

    it('AC2: blocks deploy with GoldenEvalRegressionException when locator precision falls below 80%', async () => {
      // Custom evaluator returning bad mappings (0% precision)
      const customEvaluator = async () => [
        {
          step_id: 'step_1',
          step_order: 1,
          element_id: 'wrong_elem_id',
          chosen_locator: {
            strategy: 'role_name' as const,
            value: 'wrong_value',
            score: 0.1,
            playwright_code: '',
            rank: 1,
            stability_tier: 'low' as const,
          },
          confidence: 0.1,
          rationale: 'wrong',
          needs_review: true,
        },
      ];

      await expect(
        GoldenEvalHarness.runEvaluation(undefined, {
          min_locator_precision: 0.8,
          customEvaluator,
        }),
      ).rejects.toThrow(GoldenEvalRegressionException);
    });

    it('returns detailed per-repository precision breakdown in summary', async () => {
      const summary = await GoldenEvalHarness.runEvaluation(undefined, {
        min_locator_precision: 0.8,
      });

      for (const repo of summary.repo_breakdown) {
        expect(repo.total_stories).toBe(4);
        expect(repo.precision).toBeGreaterThanOrEqual(0.8);
      }
    });
  });
});
