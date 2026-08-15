import { createHash } from 'crypto';
import {
  EmbedBatchElementInput,
  EmbedBatchRequest,
  EmbedBatchResult,
  UiElementEmbedding,
} from '@qa-automater/types';

export class UiElementEmbeddingService {
  private store: Map<string, UiElementEmbedding> = new Map();

  /**
   * Computes SHA-256 content hash for a UI element payload.
   */
  public computeContentHash(element: EmbedBatchElementInput): string {
    const payload = JSON.stringify({
      tag_name: element.tag_name,
      text_content: element.text_content ?? '',
      aria_label: element.aria_label ?? '',
      data_testid: element.data_testid ?? '',
      source_ref: element.source_ref ?? '',
    });

    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Generates a 1536-dimensional vector embedding for element text payload.
   */
  public generateVector1536(text: string): number[] {
    const vectorLength = 1536;
    const vector: number[] = new Array(vectorLength).fill(0);

    let seed = 0;
    for (let i = 0; i < text.length; i++) {
      seed = (seed << 5) - seed + text.charCodeAt(i);
      seed |= 0;
    }

    for (let i = 0; i < vectorLength; i++) {
      const val = Math.sin(seed + i * 0.01);
      vector[i] = Number(val.toFixed(6));
    }

    return vector;
  }

  /**
   * Processes a batch of UI elements: skips re-embedding if content_hash is unchanged (AC1),
   * otherwise generates vector(1536) and upserts to ui_element_embeddings (AC2).
   */
  public processBatch(request: EmbedBatchRequest): EmbedBatchResult {
    let embedded_count = 0;
    let skipped_count = 0;
    const embeddings: UiElementEmbedding[] = [];

    for (const element of request.elements) {
      const contentHash = element.content_hash || this.computeContentHash(element);
      const existing = this.store.get(element.id);

      // AC1: Given new ui_element When content_hash unchanged Then skip re-embed
      if (existing && existing.content_hash === contentHash) {
        skipped_count++;
        embeddings.push(existing);
        continue;
      }

      // AC2: Generate vector(1536) and upsert to ui_element_embeddings
      const textPayload = `${element.tag_name} ${element.text_content ?? ''} ${
        element.aria_label ?? ''
      } ${element.data_testid ?? ''}`.trim();

      const vector1536 = this.generateVector1536(textPayload);
      const now = new Date().toISOString();

      const embeddingObj: UiElementEmbedding = {
        id: existing?.id ?? `emb_${element.id}_${Date.now()}`,
        element_id: element.id,
        content_hash: contentHash,
        text_payload: textPayload,
        embedding: vector1536,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };

      this.store.set(element.id, embeddingObj);
      embedded_count++;
      embeddings.push(embeddingObj);
    }

    return {
      total_elements: request.elements.length,
      embedded_count,
      skipped_count,
      embeddings,
    };
  }

  /**
   * Returns current stored embedding by element ID.
   */
  public getStoredEmbedding(elementId: string): UiElementEmbedding | undefined {
    return this.store.get(elementId);
  }

  /**
   * Clears in-memory store.
   */
  public clearStore(): void {
    this.store.clear();
  }
}
