import { Injectable } from '@nestjs/common';
import type {
  LLMCompletionPrompt,
  LLMCompletionResponse,
  LLMJsonSchema,
  LLMProviderConfig,
  LLMProviderName,
} from '@qa-automater/types';
import { createLLMProvider, ILLMProvider } from '@qa-automater/shared';

@Injectable()
export class LlmService implements ILLMProvider {
  private provider: ILLMProvider;

  constructor(config?: LLMProviderConfig) {
    this.provider = createLLMProvider(config);
  }

  get name(): LLMProviderName {
    return this.provider.name;
  }

  get model(): string {
    return this.provider.model;
  }

  get providerName(): LLMProviderName {
    return this.provider.name;
  }

  get modelName(): string {
    return this.provider.model;
  }

  async completeStructured<T = unknown>(
    prompt: LLMCompletionPrompt,
    schema: LLMJsonSchema<T>,
  ): Promise<LLMCompletionResponse<T>> {
    return this.provider.completeStructured(prompt, schema);
  }

  /**
   * Allows re-configuring or injecting custom LLM provider instance (e.g. in unit tests)
   */
  setProvider(customProvider: ILLMProvider): void {
    this.provider = customProvider;
  }
}
