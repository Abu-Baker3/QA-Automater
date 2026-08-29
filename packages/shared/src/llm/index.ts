import type { LLMProviderConfig } from '@qa-automater/types';
import { AnthropicProvider } from './anthropic.provider';
import { FallbackLLMProvider } from './fallback.provider';
import { OpenAIProvider } from './openai.provider';
import { ILLMProvider } from './types';

export * from './types';
export * from './openai.provider';
export * from './anthropic.provider';
export * from './fallback.provider';
export * from './story-agent';
export * from './mapping-agent';
export * from './prompt-versioning';
export * from './prompt-eval-harness';
export * from './golden-stories-dataset';
export * from './golden-eval-harness';

export function createLLMProvider(config?: LLMProviderConfig): ILLMProvider {
  const fallbackEnabled = config?.fallbackEnabled ?? process.env.LLM_FALLBACK_ENABLED !== 'false';

  const primaryProvider: ILLMProvider =
    config?.primaryProvider === 'anthropic'
      ? new AnthropicProvider({
          apiKey: config?.anthropicApiKey,
          model: config?.anthropicModel,
        })
      : new OpenAIProvider({
          apiKey: config?.openaiApiKey,
          model: config?.openaiModel,
        });

  let fallbackProvider: ILLMProvider | undefined;
  if (fallbackEnabled) {
    const fallbackName =
      config?.fallbackProvider ?? (primaryProvider.name === 'openai' ? 'anthropic' : 'openai');

    fallbackProvider =
      fallbackName === 'openai'
        ? new OpenAIProvider({
            apiKey: config?.openaiApiKey,
            model: config?.openaiModel,
          })
        : new AnthropicProvider({
            apiKey: config?.anthropicApiKey,
            model: config?.anthropicModel,
          });
  }

  return new FallbackLLMProvider({
    primaryProvider,
    fallbackProvider,
    fallbackEnabled,
  });
}
