import { startHealthServer } from '@qa-automater/shared';

const VERSION = '0.1.0';

/**
 * Export worker — ZIP bundling and GitHub PR creation for generated Playwright artifacts.
 * Export pipeline added in Epic E12.
 */
function main() {
  console.log('[export-worker] starting...');
  startHealthServer({
    service: 'export-worker',
    version: VERSION,
    port: Number(process.env.PORT ?? 8083),
  });
}

main();
