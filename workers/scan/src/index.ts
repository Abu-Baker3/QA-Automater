import { startHealthServer } from '@qa-automater/shared';

const VERSION = '0.1.0';

/**
 * Scan worker — repository clone, AST parse, locator extraction.
 * Job queue integration added in Epic E4.
 */
function main() {
  console.log('[scan-worker] starting...');
  startHealthServer({
    service: 'scan-worker',
    version: VERSION,
    port: Number(process.env.PORT ?? 8081),
  });
}

main();
