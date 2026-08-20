import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import type { LLMJsonSchema } from '@qa-automater/types';
import { LlmModule } from './llm.module';
import { LlmService } from './llm.service';

interface TestPayload {
  result: string;
}

const testSchema: LLMJsonSchema<TestPayload> = {
  name: 'TestPayload',
  schema: { type: 'object', properties: { result: { type: 'string' } } },
};

describe('LlmService', () => {
  it('should be defined and initialize with default LLM provider', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LlmModule],
    }).compile();

    const service = module.get<LlmService>(LlmService);
    expect(service).toBeDefined();
    expect(service.providerName).toBe('openai');
    expect(service.modelName).toBe('gpt-4o');
  });

  it('delegates completeStructured calls to underlying provider', async () => {
    const service = new LlmService();
    const mockProvider = {
      name: 'openai' as const,
      model: 'gpt-4o',
      completeStructured: vi.fn().mockResolvedValue({
        data: { result: 'success' },
        rawText: '{"result":"success"}',
        provider: 'openai',
        model: 'gpt-4o',
      }),
    };

    service.setProvider(mockProvider);

    const res = await service.completeStructured({ userPrompt: 'Hello' }, testSchema);

    expect(mockProvider.completeStructured).toHaveBeenCalledWith(
      { userPrompt: 'Hello' },
      testSchema,
    );
    expect(res.data).toEqual({ result: 'success' });
  });
});
