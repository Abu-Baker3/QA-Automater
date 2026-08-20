import { describe, it, expect, beforeEach } from 'vitest';
import { ElementsService } from '../elements/elements.service';
import { RagRetrievalService } from './rag-retrieval.service';
import { RagRetrievalController } from './rag-retrieval.controller';

describe('RagRetrievalController (E9.3)', () => {
  let controller: RagRetrievalController;
  let ragService: RagRetrievalService;
  let elementsService: ElementsService;

  beforeEach(() => {
    elementsService = new ElementsService();
    ragService = new RagRetrievalService(elementsService);
    controller = new RagRetrievalController(ragService);
  });

  it('POST /stories/retrieve-candidates returns hybrid RAG candidates and retrieval_trace for step', async () => {
    const result = await controller.retrieveCandidates({
      step_description: 'enter email on login page',
      page_hint: '/login',
      repository_id: 'repo_main',
    });

    expect(result.step_description).toBe('enter email on login page');
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.length).toBeLessThanOrEqual(10);

    const topCandidate = result.candidates[0];
    expect(topCandidate?.id).toBe('elem_email_input');

    const trace = result.retrieval_trace;
    expect(trace).toBeDefined();
    expect(trace.step_description).toBe('enter email on login page');
    expect(trace.total_candidates_evaluated).toBeGreaterThan(0);
    expect(trace.top_candidates.length).toBe(result.candidates.length);
    expect(trace.channel_breakdown).toBeDefined();
  });

  it('POST /stories/repositories/:id/retrieve-candidates scopes candidate retrieval to target repository', async () => {
    const result = await controller.retrieveRepositoryCandidates('repo_main', {
      step_description: 'enter password on login page',
      page_hint: '/login',
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.retrieval_trace.repository_id).toBe('repo_main');
  });

  it('POST /stories/retrieve-candidates throws BadRequestException when step_description is missing', async () => {
    const { BadRequestException } = await import('@nestjs/common');
    await expect(controller.retrieveCandidates({ step_description: '  ' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
