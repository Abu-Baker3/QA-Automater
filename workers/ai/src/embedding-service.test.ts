import { describe, it, expect, beforeEach } from 'vitest';
import { UiElementEmbeddingService } from './embedding-service';
import { EmbedBatchElementInput, EmbedBatchRequest } from '@qa-automater/types';

describe('UiElementEmbeddingService (E7.1)', () => {
  let service: UiElementEmbeddingService;

  beforeEach(() => {
    service = new UiElementEmbeddingService();
    service.clearStore();
  });

  describe('AC1: Skip Re-Embedding on Unchanged content_hash', () => {
    it('should skip re-embedding when content_hash is unchanged for an element', () => {
      const elementInput: EmbedBatchElementInput = {
        id: 'elem_101',
        tag_name: 'button',
        text_content: 'Submit Order',
        data_testid: 'submit-btn',
        source_ref: 'app/checkout/page.tsx:42',
      };

      const request1: EmbedBatchRequest = { elements: [elementInput] };
      const result1 = service.processBatch(request1);

      expect(result1.embedded_count).toBe(1);
      expect(result1.skipped_count).toBe(0);
      expect(result1.embeddings[0]!.embedding.length).toBe(1536);

      // Re-run batch with identical element payload
      const request2: EmbedBatchRequest = { elements: [elementInput] };
      const result2 = service.processBatch(request2);

      expect(result2.embedded_count).toBe(0);
      expect(result2.skipped_count).toBe(1);
      expect(result2.embeddings[0]!.content_hash).toBe(result1.embeddings[0]!.content_hash);
    });

    it('should re-embed when element text content or attributes change', () => {
      const initialInput: EmbedBatchElementInput = {
        id: 'elem_102',
        tag_name: 'button',
        text_content: 'Pay Now',
      };

      service.processBatch({ elements: [initialInput] });

      const updatedInput: EmbedBatchElementInput = {
        id: 'elem_102',
        tag_name: 'button',
        text_content: 'Pay $50.00 Now', // Content changed
      };

      const result = service.processBatch({ elements: [updatedInput] });

      expect(result.embedded_count).toBe(1);
      expect(result.skipped_count).toBe(0);
    });
  });

  describe('AC2: 100 Elements Batch Embedding with vector(1536)', () => {
    it('should process a batch of 100 UI elements and upsert vector(1536) embeddings', () => {
      const elements: EmbedBatchElementInput[] = Array.from({ length: 100 }, (_, i) => ({
        id: `elem_${i + 1}`,
        tag_name: i % 2 === 0 ? 'button' : 'input',
        text_content: `Button or Field ${i + 1}`,
        data_testid: `test-id-${i + 1}`,
        source_ref: `app/page_${i + 1}.tsx:${(i + 1) * 5}`,
      }));

      const request: EmbedBatchRequest = { elements };
      const result = service.processBatch(request);

      expect(result.total_elements).toBe(100);
      expect(result.embedded_count).toBe(100);
      expect(result.skipped_count).toBe(0);
      expect(result.embeddings.length).toBe(100);

      // Verify every embedding has vector length of 1536
      for (const emb of result.embeddings) {
        expect(emb.embedding.length).toBe(1536);
        expect(typeof emb.content_hash).toBe('string');
        expect(emb.content_hash.length).toBeGreaterThan(0);
      }
    });
  });
});
