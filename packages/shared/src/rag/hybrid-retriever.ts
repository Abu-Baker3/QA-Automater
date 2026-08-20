import type {
  ElementSearchResultItem,
  HybridRetrievalRequest,
  HybridRetrievalResult,
  RetrievalChannelScore,
  RetrievalTrace,
} from '@qa-automater/types';
import { incrementCounter, recordHistogram, withSpan } from '../telemetry';

export class HybridRAGRetriever {
  /**
   * Calculates Vector Channel score (0.0 to 1.0) based on text/semantic similarity.
   */
  public calculateVectorScore(stepText: string, element: ElementSearchResultItem): number {
    if (!stepText) return 0;
    const textLower = stepText.toLowerCase();
    const content = (element.text_content || '').toLowerCase();
    const primaryVal = (element.primary_candidate?.value || '').toLowerCase();
    const primaryCode = (element.primary_candidate?.playwright_code || '').toLowerCase();

    let score = 0;

    // Direct match on element text or primary locator value
    if (content && textLower.includes(content)) {
      score += 0.6;
    } else if (
      content &&
      content.split(' ').some((word) => word.length > 2 && textLower.includes(word))
    ) {
      score += 0.3;
    }

    if (primaryVal && textLower.includes(primaryVal)) {
      score += 0.3;
    }

    if (primaryCode && textLower.includes(primaryCode)) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Calculates Keyword Channel score (0.0 to 1.0) based on BM25/keyword exact matching.
   */
  public calculateKeywordScore(stepText: string, element: ElementSearchResultItem): number {
    if (!stepText) return 0;
    const keywords = stepText
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((k) => k.length > 2);

    if (keywords.length === 0) return 0;

    const targetBag = [
      element.tag_name,
      element.text_content || '',
      element.source_ref || '',
      element.primary_candidate?.value || '',
      ...(element.candidates?.map((c) => `${c.strategy}:${c.value}`) || []),
    ]
      .join(' ')
      .toLowerCase();

    let matchCount = 0;
    for (const kw of keywords) {
      if (targetBag.includes(kw)) {
        matchCount++;
      }
    }

    return Math.min(1.0, matchCount / keywords.length);
  }

  /**
   * Calculates Graph Channel score (0.0 to 1.0) based on route proximity and form association.
   */
  public calculateGraphScore(
    pageHint: string | undefined,
    stepText: string,
    element: ElementSearchResultItem,
  ): number {
    if (!stepText) return 0;
    let score = 0;
    const textLower = stepText.toLowerCase();

    // Check explicitly passed page hint or infer route from step text (e.g., "login page" -> /login)
    const hint = pageHint?.toLowerCase() || '';
    const route = (element.route_path || '').toLowerCase();

    if (hint && route.includes(hint)) {
      score += 0.8;
    } else if (route && route !== '/' && textLower.includes(route.replace('/', ''))) {
      score += 0.6;
    }

    // Form element association boost (input / button tags inside forms)
    if (['input', 'button', 'select', 'textarea'].includes(element.tag_name.toLowerCase())) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Executes hybrid retrieval across candidate pool (AC1: top-10 candidates include login page email input, AC2: retrieval_trace stored).
   */
  async retrieve(
    request: HybridRetrievalRequest,
    elements: ElementSearchResultItem[],
  ): Promise<HybridRetrievalResult> {
    if (!request || !request.step_description || !request.step_description.trim()) {
      throw new Error('Hybrid RAG retrieval requires a valid step_description');
    }

    const startTime = Date.now();
    const topK = Math.max(1, request.top_k ?? 10);

    return withSpan('rag.hybrid_retrieve', 'retrieve', async (span) => {
      span.setAttribute('step.description', request.step_description);
      if (request.repository_id) {
        span.setAttribute('repository.id', request.repository_id);
      }

      let repoElements = elements;
      if (request.repository_id) {
        repoElements = elements.filter(
          (e) =>
            !e.repository_id ||
            e.repository_id.toLowerCase() === request.repository_id?.toLowerCase(),
        );
      }

      let vectorCandidatesCount = 0;
      let keywordCandidatesCount = 0;
      let graphCandidatesCount = 0;

      const scoredCandidates: Array<{
        element: ElementSearchResultItem;
        scores: RetrievalChannelScore;
      }> = [];

      for (const element of repoElements) {
        const vecScore = this.calculateVectorScore(request.step_description, element);
        const kwScore = this.calculateKeywordScore(request.step_description, element);
        const graphScore = this.calculateGraphScore(
          request.page_hint,
          request.step_description,
          element,
        );

        if (vecScore > 0) vectorCandidatesCount++;
        if (kwScore > 0) keywordCandidatesCount++;
        if (graphScore > 0) graphCandidatesCount++;

        // Hybrid fusion scoring: S_hybrid = 0.5 * S_vec + 0.3 * S_kw + 0.2 * S_graph
        const fusedScore = Number((0.5 * vecScore + 0.3 * kwScore + 0.2 * graphScore).toFixed(4));

        if (fusedScore > 0) {
          scoredCandidates.push({
            element: {
              ...element,
              relevance_score: fusedScore,
            },
            scores: {
              vector_score: Number(vecScore.toFixed(4)),
              keyword_score: Number(kwScore.toFixed(4)),
              graph_score: Number(graphScore.toFixed(4)),
              fused_score: fusedScore,
            },
          });
        }
      }

      // Sort by fused score descending
      scoredCandidates.sort((a, b) => b.scores.fused_score - a.scores.fused_score);

      // Select top-K
      const topSelected = scoredCandidates.slice(0, topK);
      const executionTimeMs = Date.now() - startTime;

      const retrievalTrace: RetrievalTrace = {
        step_description: request.step_description,
        page_hint: request.page_hint,
        repository_id: request.repository_id,
        total_candidates_evaluated: repoElements.length,
        execution_time_ms: executionTimeMs,
        top_candidates: topSelected.map((item) => ({
          element_id: item.element.id,
          tag_name: item.element.tag_name,
          route_path: item.element.route_path,
          scores: item.scores,
        })),
        channel_breakdown: {
          vector_candidates_count: vectorCandidatesCount,
          keyword_candidates_count: keywordCandidatesCount,
          graph_candidates_count: graphCandidatesCount,
        },
        timestamp: new Date().toISOString(),
      };

      recordHistogram('rag', 'retrieval.duration_ms', executionTimeMs);
      incrementCounter('rag', 'retrieval.success', 1, {
        top_candidates_count: String(topSelected.length),
      });

      return {
        step_description: request.step_description,
        candidates: topSelected.map((item) => item.element),
        retrieval_trace: retrievalTrace,
      };
    });
  }
}
