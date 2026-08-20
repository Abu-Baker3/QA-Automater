import type {
  LLMCompletionPrompt,
  LLMCompletionResponse,
  LLMJsonSchema,
  LLMProviderName,
} from '@qa-automater/types';
import { incrementCounter, withSpan } from '../telemetry';
import { ILLMProvider, LLMProviderException } from './types';

export interface FallbackLLMProviderOptions {
  primaryProvider: ILLMProvider;
  fallbackProvider?: ILLMProvider;
  fallbackEnabled?: boolean;
}

export class FallbackLLMProvider implements ILLMProvider {
  readonly primaryProvider: ILLMProvider;
  readonly fallbackProvider?: ILLMProvider;
  readonly fallbackEnabled: boolean;

  constructor(options: FallbackLLMProviderOptions) {
    this.primaryProvider = options.primaryProvider;
    this.fallbackProvider = options.fallbackProvider;
    this.fallbackEnabled = options.fallbackEnabled ?? true;
  }

  get name(): LLMProviderName {
    return this.primaryProvider.name;
  }

  get model(): string {
    return this.primaryProvider.model;
  }

  async completeStructured<T = unknown>(
    prompt: LLMCompletionPrompt,
    schema: LLMJsonSchema<T>,
  ): Promise<LLMCompletionResponse<T>> {
    return withSpan('llm.completeStructuredWithFallback', 'completeStructured', async (span) => {
      span.setAttribute('llm.primary_provider', this.primaryProvider.name);
      span.setAttribute('llm.fallback_enabled', this.fallbackEnabled);

      try {
        return await this.primaryProvider.completeStructured(prompt, schema);
      } catch (primaryError) {
        const primaryErrMsg =
          primaryError instanceof Error ? primaryError.message : String(primaryError);

        if (!this.fallbackEnabled || !this.fallbackProvider) {
          throw primaryError;
        }

        console.warn(
          `[LLM Provider] Primary provider '${this.primaryProvider.name}' failed: ${primaryErrMsg}. Retrying with fallback provider '${this.fallbackProvider.name}'...`,
        );

        incrementCounter('llm', 'llm.completions.fallback', 1, {
          primary: this.primaryProvider.name,
          fallback: this.fallbackProvider.name,
        });

        try {
          span.setAttribute('llm.used_fallback', true);
          return await this.fallbackProvider.completeStructured(prompt, schema);
        } catch (fallbackError) {
          const fallbackErrMsg =
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

          throw new LLMProviderException(
            `Primary LLM provider '${this.primaryProvider.name}' failed (${primaryErrMsg}) and fallback provider '${this.fallbackProvider.name}' also failed: ${fallbackErrMsg}`,
            this.primaryProvider.name,
            { primaryError, fallbackError },
          );
        }
      }
    });
  }
}
