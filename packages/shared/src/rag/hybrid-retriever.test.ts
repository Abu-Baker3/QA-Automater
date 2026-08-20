import { describe, expect, it } from 'vitest';
import type { ElementSearchResultItem } from '@qa-automater/types';
import { HybridRAGRetriever } from './hybrid-retriever';

const sampleElementsPool: ElementSearchResultItem[] = [
  {
    id: 'elem_email_input',
    scan_id: 'scan_100',
    repository_id: 'repo_main',
    route_path: '/login',
    tag_name: 'input',
    text_content: 'Email Address',
    source_ref: 'app/login/page.tsx:24',
    stability_tier: 'high',
    relevance_score: 1.0,
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
    id: 'elem_password_input',
    scan_id: 'scan_100',
    repository_id: 'repo_main',
    route_path: '/login',
    tag_name: 'input',
    text_content: 'Password',
    source_ref: 'app/login/page.tsx:32',
    stability_tier: 'high',
    relevance_score: 0.9,
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
  {
    id: 'elem_submit_btn',
    scan_id: 'scan_100',
    repository_id: 'repo_main',
    route_path: '/login',
    tag_name: 'button',
    text_content: 'Sign In',
    source_ref: 'app/login/page.tsx:42',
    stability_tier: 'high',
    relevance_score: 0.8,
    primary_candidate: {
      strategy: 'testid',
      value: 'login-submit',
      score: 0.98,
      playwright_code: "page.getByTestId('login-submit')",
      rank: 1,
      stability_tier: 'high',
    },
    candidates: [],
  },
  {
    id: 'elem_dashboard_header',
    scan_id: 'scan_100',
    repository_id: 'repo_main',
    route_path: '/dashboard',
    tag_name: 'h1',
    text_content: 'Welcome Dashboard Header',
    source_ref: 'app/dashboard/page.tsx:10',
    stability_tier: 'medium',
    relevance_score: 0.5,
    primary_candidate: {
      strategy: 'role_name',
      value: 'heading:Welcome Dashboard',
      score: 0.85,
      playwright_code: "page.getByRole('heading', { name: 'Welcome Dashboard' })",
      rank: 1,
      stability_tier: 'medium',
    },
    candidates: [],
  },
];

describe('HybridRAGRetriever (E9.3)', () => {
  it('AC1: retrieves top-10 candidates including login page email input for step "enter email on login page"', async () => {
    const retriever = new HybridRAGRetriever();
    const result = await retriever.retrieve(
      {
        step_description: 'enter email on login page',
        page_hint: '/login',
        repository_id: 'repo_main',
      },
      sampleElementsPool,
    );

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.length).toBeLessThanOrEqual(10);

    const topCandidate = result.candidates[0];
    expect(topCandidate?.id).toBe('elem_email_input');
    expect(topCandidate?.route_path).toBe('/login');
    expect(topCandidate?.tag_name).toBe('input');
  });

  it('AC2: includes retrieval_trace with complete audit metrics and channel breakdown', async () => {
    const retriever = new HybridRAGRetriever();
    const result = await retriever.retrieve(
      {
        step_description: 'enter email on login page',
        page_hint: '/login',
        repository_id: 'repo_main',
      },
      sampleElementsPool,
    );

    const trace = result.retrieval_trace;
    expect(trace).toBeDefined();
    expect(trace.step_description).toBe('enter email on login page');
    expect(trace.page_hint).toBe('/login');
    expect(trace.repository_id).toBe('repo_main');
    expect(trace.total_candidates_evaluated).toBe(sampleElementsPool.length);
    expect(typeof trace.execution_time_ms).toBe('number');
    expect(trace.timestamp).toBeDefined();

    expect(trace.top_candidates.length).toBe(result.candidates.length);
    const topScore = trace.top_candidates[0]?.scores;
    expect(topScore).toBeDefined();
    expect(topScore?.fused_score).toBeGreaterThan(0);
    expect(topScore?.vector_score).toBeGreaterThanOrEqual(0);
    expect(topScore?.keyword_score).toBeGreaterThanOrEqual(0);
    expect(topScore?.graph_score).toBeGreaterThanOrEqual(0);

    expect(trace.channel_breakdown).toEqual({
      vector_candidates_count: expect.any(Number),
      keyword_candidates_count: expect.any(Number),
      graph_candidates_count: expect.any(Number),
    });
  });

  it('throws Error when step_description is missing or empty', async () => {
    const retriever = new HybridRAGRetriever();
    await expect(retriever.retrieve({ step_description: '' }, sampleElementsPool)).rejects.toThrow(
      'Hybrid RAG retrieval requires a valid step_description',
    );
  });

  it('handles negative or invalid top_k by coercing to minimum of 1', async () => {
    const retriever = new HybridRAGRetriever();
    const result = await retriever.retrieve(
      {
        step_description: 'enter email on login page',
        top_k: -5,
      },
      sampleElementsPool,
    );

    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates.length).toBeLessThanOrEqual(sampleElementsPool.length);
  });
});
