import { describe, expect, it, vi } from 'vitest';
import type { LLMJsonSchema } from '@qa-automater/types';
import {
  AnthropicProvider,
  FallbackLLMProvider,
  LLMProviderException,
  LLMValidationException,
  OpenAIProvider,
  createLLMProvider,
} from './index';

interface TestSchemaType {
  steps: string[];
  confidence: number;
}

const sampleSchema: LLMJsonSchema<TestSchemaType> = {
  name: 'TestSchema',
  schema: {
    type: 'object',
    properties: {
      steps: { type: 'array', items: { type: 'string' } },
      confidence: { type: 'number' },
    },
    required: ['steps', 'confidence'],
  },
  validator: (data: unknown): data is TestSchemaType => {
    const obj = data as Record<string, unknown>;
    return (
      obj !== null &&
      typeof obj === 'object' &&
      Array.isArray(obj.steps) &&
      typeof obj.confidence === 'number'
    );
  },
};

describe('LLM Provider Abstraction', () => {
  describe('OpenAIProvider (AC1)', () => {
    it('returns structured JSON when calling OpenAI completion', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  steps: ['Click login button', 'Enter password'],
                  confidence: 0.95,
                }),
              },
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
        }),
      });

      const provider = new OpenAIProvider({
        apiKey: 'test-openai-key',
        model: 'gpt-4o',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const response = await provider.completeStructured(
        { userPrompt: 'Decompose login user story' },
        sampleSchema,
      );

      expect(response.provider).toBe('openai');
      expect(response.model).toBe('gpt-4o');
      expect(response.data).toEqual({
        steps: ['Click login button', 'Enter password'],
        confidence: 0.95,
      });
      expect(response.usage).toEqual({
        promptTokens: 50,
        completionTokens: 20,
        totalTokens: 70,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws LLMProviderException if API key is missing', async () => {
      const provider = new OpenAIProvider({ apiKey: '' });
      await expect(
        provider.completeStructured({ userPrompt: 'test' }, sampleSchema),
      ).rejects.toThrow(LLMProviderException);
    });

    it('throws LLMValidationException when output fails schema validation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ invalidField: 123 }),
              },
            },
          ],
        }),
      });

      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(
        provider.completeStructured({ userPrompt: 'test' }, sampleSchema),
      ).rejects.toThrow(LLMValidationException);
    });

    it('throws LLMProviderException when HTTP 200 payload cannot be parsed as JSON', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(
        provider.completeStructured({ userPrompt: 'test' }, sampleSchema),
      ).rejects.toThrow(LLMProviderException);
    });
  });

  describe('AnthropicProvider', () => {
    it('returns structured JSON and strips markdown backticks', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: '```json\n{"steps": ["Open page"], "confidence": 0.9}\n```',
            },
          ],
          usage: { input_tokens: 40, output_tokens: 15 },
        }),
      });

      const provider = new AnthropicProvider({
        apiKey: 'test-anthropic-key',
        model: 'claude-3-5-sonnet',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const response = await provider.completeStructured(
        { userPrompt: 'Test anthropic' },
        sampleSchema,
      );

      expect(response.provider).toBe('anthropic');
      expect(response.data).toEqual({
        steps: ['Open page'],
        confidence: 0.9,
      });
      expect(response.usage).toEqual({
        promptTokens: 40,
        completionTokens: 15,
        totalTokens: 55,
      });
    });

    it('extracts JSON when Anthropic output includes introductory prose before codeblock', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: 'Here is the JSON response:\n```json\n{"steps": ["Step with prose"], "confidence": 0.92}\n```\nHope this helps!',
            },
          ],
        }),
      });

      const provider = new AnthropicProvider({
        apiKey: 'test-anthropic-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const response = await provider.completeStructured(
        { userPrompt: 'Test preamble' },
        sampleSchema,
      );

      expect(response.data).toEqual({
        steps: ['Step with prose'],
        confidence: 0.92,
      });
    });
  });

  describe('FallbackLLMProvider (AC2)', () => {
    it('retries with Anthropic once when OpenAI fails and fallback is enabled', async () => {
      const primaryFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const fallbackFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                steps: ['Fallback step 1'],
                confidence: 0.88,
              }),
            },
          ],
        }),
      });

      const primary = new OpenAIProvider({
        apiKey: 'key1',
        fetchFn: primaryFetch as unknown as typeof fetch,
      });

      const fallback = new AnthropicProvider({
        apiKey: 'key2',
        fetchFn: fallbackFetch as unknown as typeof fetch,
      });

      const orchestrator = new FallbackLLMProvider({
        primaryProvider: primary,
        fallbackProvider: fallback,
        fallbackEnabled: true,
      });

      const result = await orchestrator.completeStructured(
        { userPrompt: 'Failover test' },
        sampleSchema,
      );

      expect(primaryFetch).toHaveBeenCalledTimes(1);
      expect(fallbackFetch).toHaveBeenCalledTimes(1);
      expect(result.provider).toBe('anthropic');
      expect(result.data).toEqual({
        steps: ['Fallback step 1'],
        confidence: 0.88,
      });
    });

    it('does not attempt fallback when fallback is disabled', async () => {
      const primaryFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      });

      const fallbackFetch = vi.fn();

      const primary = new OpenAIProvider({
        apiKey: 'key1',
        fetchFn: primaryFetch as unknown as typeof fetch,
      });

      const fallback = new AnthropicProvider({
        apiKey: 'key2',
        fetchFn: fallbackFetch as unknown as typeof fetch,
      });

      const orchestrator = new FallbackLLMProvider({
        primaryProvider: primary,
        fallbackProvider: fallback,
        fallbackEnabled: false,
      });

      await expect(
        orchestrator.completeStructured({ userPrompt: 'No fallback test' }, sampleSchema),
      ).rejects.toThrow('OpenAI API returned HTTP 503');

      expect(primaryFetch).toHaveBeenCalledTimes(1);
      expect(fallbackFetch).not.toHaveBeenCalled();
    });

    it('throws LLMProviderException if both primary and fallback fail', async () => {
      const primaryFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Primary error',
      });

      const fallbackFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => 'Fallback error',
      });

      const primary = new OpenAIProvider({
        apiKey: 'key1',
        fetchFn: primaryFetch as unknown as typeof fetch,
      });

      const fallback = new AnthropicProvider({
        apiKey: 'key2',
        fetchFn: fallbackFetch as unknown as typeof fetch,
      });

      const orchestrator = new FallbackLLMProvider({
        primaryProvider: primary,
        fallbackProvider: fallback,
        fallbackEnabled: true,
      });

      await expect(
        orchestrator.completeStructured({ userPrompt: 'Double failure' }, sampleSchema),
      ).rejects.toThrow(LLMProviderException);
    });
  });

  describe('createLLMProvider Factory', () => {
    it('creates FallbackLLMProvider with OpenAI primary and Anthropic fallback', () => {
      const provider = createLLMProvider({
        openaiApiKey: 'test-oa-key',
        anthropicApiKey: 'test-ant-key',
      });

      expect(provider).toBeInstanceOf(FallbackLLMProvider);
      const fallbackProv = provider as FallbackLLMProvider;
      expect(fallbackProv.primaryProvider.name).toBe('openai');
      expect(fallbackProv.fallbackProvider?.name).toBe('anthropic');
      expect(fallbackProv.fallbackEnabled).toBe(true);
    });
  });
});
