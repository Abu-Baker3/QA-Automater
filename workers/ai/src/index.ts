import { startHealthServer } from '@qa-automater/shared';

const VERSION = '0.1.0';

/**
 * AI worker — story decomposition, RAG retrieval, locator mapping, codegen orchestration.
 * LLM integration added in Epic E9.
 */
function main() {
  console.log('[ai-worker] starting...');
  startHealthServer({
    service: 'ai-worker',
    version: VERSION,
    port: Number(process.env.PORT ?? 8082),
  });
}

main();
