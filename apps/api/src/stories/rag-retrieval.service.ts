import { Injectable } from '@nestjs/common';
import type { HybridRetrievalRequest, HybridRetrievalResult } from '@qa-automater/types';
import { HybridRAGRetriever } from '@qa-automater/shared';
import { ElementsService } from '../elements/elements.service';

@Injectable()
export class RagRetrievalService {
  private readonly retriever: HybridRAGRetriever;

  constructor(private readonly elementsService: ElementsService) {
    this.retriever = new HybridRAGRetriever();
  }

  /**
   * Retrieves top candidate UI elements using Hybrid RAG (Vector + Keyword + Graph) and generates retrieval_trace.
   */
  async retrieveCandidates(request: HybridRetrievalRequest): Promise<HybridRetrievalResult> {
    const searchResponse = await this.elementsService.searchElements({
      repository_id: request.repository_id,
      page_route: request.page_hint,
      limit: 10000,
    });

    return this.retriever.retrieve(request, searchResponse.data);
  }
}
