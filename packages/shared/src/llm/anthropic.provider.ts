import type {
  LLMCompletionPrompt,
  LLMCompletionResponse,
  LLMJsonSchema,
  LLMProviderName,
} from '@qa-automater/types';
import { withSpan, incrementCounter, recordHistogram } from '../telemetry';
import { ILLMProvider, LLMProviderException, LLMValidationException } from './types';

export interface AnthropicProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class AnthropicProvider implements ILLMProvider {
  readonly name: LLMProviderName = 'anthropic';
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: AnthropicProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
    this.model = options.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022';
    this.baseUrl = options.baseUrl ?? 'https://api.anthropic.com/v1';
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  async completeStructured<T = unknown>(
    prompt: LLMCompletionPrompt,
    schema: LLMJsonSchema<T>,
  ): Promise<LLMCompletionResponse<T>> {
    if (!this.apiKey) {
      throw new LLMProviderException(
        'Anthropic API key is missing. Set ANTHROPIC_API_KEY in environment variables.',
        'anthropic',
      );
    }

    const startTime = Date.now();

    return withSpan('anthropic.completeStructured', 'completeStructured', async (span) => {
      span.setAttribute('llm.provider', 'anthropic');
      span.setAttribute('llm.model', this.model);
      span.setAttribute('llm.schema_name', schema.name);

      const systemPrompt =
        (prompt.systemPrompt ? `${prompt.systemPrompt}\n\n` : '') +
        `Target JSON Schema (${schema.name}):\n${JSON.stringify(schema.schema, null, 2)}\n\nCRITICAL: Respond ONLY with a single JSON object. No explanation, markdown codeblock formatting, or preamble outside the JSON output.`;

      const requestBody = {
        model: this.model,
        max_tokens: prompt.maxTokens ?? 4096,
        system: systemPrompt,
        temperature: prompt.temperature ?? 0.2,
        messages: [{ role: 'user', content: prompt.userPrompt }],
      };

      let response: Response;
      try {
        response = await this.fetchFn(`${this.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(requestBody),
        });
      } catch (error) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'anthropic' });
        throw new LLMProviderException(
          `Anthropic network request failed: ${error instanceof Error ? error.message : String(error)}`,
          'anthropic',
          error,
        );
      }

      const durationMs = Date.now() - startTime;
      recordHistogram('llm', 'llm.completion.duration_ms', durationMs, { provider: 'anthropic' });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'anthropic' });
        throw new LLMProviderException(
          `Anthropic API returned HTTP ${response.status}: ${errorText}`,
          'anthropic',
        );
      }

      let jsonPayload: {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      };
      try {
        jsonPayload = (await response.json()) as typeof jsonPayload;
      } catch (err) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'anthropic' });
        throw new LLMProviderException(
          `Failed to parse Anthropic API response payload as JSON: ${err instanceof Error ? err.message : String(err)}`,
          'anthropic',
          err,
        );
      }

      let rawText = jsonPayload.content?.[0]?.text ?? '';
      if (!rawText) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'anthropic' });
        throw new LLMValidationException(
          'Anthropic returned empty completion output',
          'anthropic',
          rawText,
        );
      }

      // Clean markdown code blocks if present (handles preamble text and code fences)
      const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch && codeBlockMatch[1]) {
        rawText = codeBlockMatch[1].trim();
      } else {
        rawText = rawText.trim();
      }

      let parsedData: unknown;
      try {
        parsedData = JSON.parse(rawText);
      } catch (err) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'anthropic' });
        throw new LLMValidationException(
          `Anthropic response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
          'anthropic',
          rawText,
        );
      }

      if (schema.validator && !schema.validator(parsedData)) {
        incrementCounter('llm', 'llm.completions.failed', 1, { provider: 'anthropic' });
        throw new LLMValidationException(
          `Anthropic output failed schema validation for '${schema.name}'`,
          'anthropic',
          rawText,
        );
      }

      incrementCounter('llm', 'llm.completions.total', 1, { provider: 'anthropic' });

      const usage = jsonPayload.usage
        ? {
            promptTokens: jsonPayload.usage.input_tokens,
            completionTokens: jsonPayload.usage.output_tokens,
            totalTokens: jsonPayload.usage.input_tokens + jsonPayload.usage.output_tokens,
          }
        : undefined;

      return {
        data: parsedData as T,
        rawText,
        provider: 'anthropic',
        model: this.model,
        usage,
      };
    });
  }
}
