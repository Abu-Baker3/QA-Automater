import { createHash } from 'node:crypto';

export const STORY_AGENT_PROMPT_VERSION = 'v1.0.0';
export const MAPPING_AGENT_PROMPT_VERSION = 'v1.0.0';

/**
 * Computes a deterministic SHA-256 hash prefix for prompt templates.
 */
export function computePromptHash(systemPrompt: string, userPromptTemplate = ''): string {
  const combined = `${systemPrompt.trim()}\n---\n${userPromptTemplate.trim()}`;
  const fullHash = createHash('sha256').update(combined).digest('hex');
  return `sha256:${fullHash.substring(0, 16)}`;
}
