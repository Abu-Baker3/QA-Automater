import type {
  LLMCompletionPrompt,
  LLMCompletionResponse,
  LLMJsonSchema,
  LLMProviderName,
} from '@qa-automater/types';
import { withSpan, incrementCounter, recordHistogram } from '../telemetry';
import { ILLMProvider, LLMProviderException, LLMValidationException } from './types';

export interface OpenAIProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class OpenAIProvider implements ILLMProvider {
  readonly name: LLMProviderName = 'openai';
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: OpenAIProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.model = options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o';
    this.baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  async completeStructured<T = unknown>(
    prompt: LLMCompletionPrompt,
    schema: LLMJsonSchema<T>,
  ): Promise<LLMCompletionResponse<T>> {
    if (!this.apiKey) {
      throw new LLMProviderException(
        'OpenAI API key is missing. Set OPENAI_API_KEY in environment variables.',
        'openai',
      );
    }

    const startTime = Date.now();

    return withSpan('openai.completeStructured', 'completeStructured', async (span) => {
      span.setAttribute('llm.provider', 'openai');
      span.setAttribute('llm.model', this.model);
      span.setAttribute('llm.schema_name', schema.name);

      const systemMessage =
        (prompt.systemPrompt ? `${prompt.systemPrompt}\n\n` : '') +
        `Target JSON Schema (${schema.name}):\n${JSON.stringify(schema.schema, null, 2)}\n\nYou MUST respond with valid JSON matching this schema.`;

      const requestBody = {
        model: this.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt.userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: prompt.temperature ?? 0.2,
        ...(prompt.maxTokens ? { max_tokens: prompt.maxTokens } : {}),
      };

      let response: Response;
      try {
        response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
      } catch (error) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'openai' });
        throw new LLMProviderException(
          `OpenAI network request failed: ${error instanceof Error ? error.message : String(error)}`,
          'openai',
          error,
        );
      }

      const durationMs = Date.now() - startTime;
      recordHistogram('llm', 'llm.completion.duration_ms', durationMs, { provider: 'openai' });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'openai' });
        throw new LLMProviderException(
          `OpenAI API returned HTTP ${response.status}: ${errorText}`,
          'openai',
        );
      }

      let jsonPayload: {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };
      try {
        jsonPayload = (await response.json()) as typeof jsonPayload;
      } catch (err) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'openai' });
        throw new LLMProviderException(
          `Failed to parse OpenAI API response payload as JSON: ${err instanceof Error ? err.message : String(err)}`,
          'openai',
          err,
        );
      }

      const rawText = jsonPayload.choices?.[0]?.message?.content ?? '';
      if (!rawText) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'openai' });
        throw new LLMValidationException(
          'OpenAI returned empty completion output',
          'openai',
          rawText,
        );
      }

      let parsedData: unknown;
      try {
        parsedData = JSON.parse(rawText);
      } catch (err) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'openai' });
        throw new LLMValidationException(
          `OpenAI response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
          'openai',
          rawText,
        );
      }

      if (schema.validator && !schema.validator(parsedData)) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'openai' });
        throw new LLMValidationException(
          `OpenAI output failed schema validation for '${schema.name}'`,
          'openai',
          rawText,
        );
      }

      incrementCounter('llm', 'llm.completions.total', 1, { provider: 'openai' });

      return {
        data: parsedData as T,
        rawText,
        provider: 'openai',
        model: this.model,
        usage: jsonPayload.usage
          ? {
              promptTokens: jsonPayload.usage.prompt_tokens,
              completionTokens: jsonPayload.usage.completion_tokens,
              totalTokens: jsonPayload.usage.total_tokens,
            }
          : undefined,
      };
    });
  }
}
