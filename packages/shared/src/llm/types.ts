import type {
  LLMCompletionPrompt,
  LLMCompletionResponse,
  LLMJsonSchema,
  LLMProviderName,
} from '@qa-automater/types';

export interface ILLMProvider {
  readonly name: LLMProviderName;
  readonly model: string;
  completeStructured<T = unknown>(
    prompt: LLMCompletionPrompt,
    schema: LLMJsonSchema<T>,
  ): Promise<LLMCompletionResponse<T>>;
}

export class LLMProviderException extends Error {
  readonly provider: LLMProviderName;
  readonly cause?: unknown;

  constructor(message: string, provider: LLMProviderName, cause?: unknown) {
    super(message);
    this.name = 'LLMProviderException';
    this.provider = provider;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LLMValidationException extends Error {
  readonly provider: LLMProviderName;
  readonly rawText: string;

  constructor(message: string, provider: LLMProviderName, rawText: string) {
    super(message);
    this.name = 'LLMValidationException';
    this.provider = provider;
    this.rawText = rawText;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
