import { startHealthServer, initTelemetry, createWorker, QueueName } from '@qa-automater/shared';
import { RepositoryCloner } from './repository-cloner';

initTelemetry('qa-worker-scan');

const VERSION = '0.1.0';
const repositoryCloner = new RepositoryCloner();

export interface ScanJobPayload {
  job_id: string;
  scan_id: string;
  repository_id: string;
  full_name: string;
  branch: string;
  org_id: string;
  clone_url?: string;
  token?: string;
}

/**
 * Scan worker — repository shallow clone, tarball generation, AST parsing, locator extraction.
 */
function main() {
  console.log('[scan-worker] starting...');

  startHealthServer({
    service: 'scan-worker',
    version: VERSION,
    port: Number(process.env.PORT ?? 8081),
  });

  const worker = createWorker<ScanJobPayload>(QueueName.SCAN, async (job) => {
    console.log(`[scan-worker] Processing job ${job.id}: ${job.name} for repo ${job.data.full_name}`);
    const cloneUrl = job.data.clone_url || `https://github.com/${job.data.full_name}.git`;

    const result = await repositoryCloner.cloneAndUpload({
      orgId: job.data.org_id,
      repoId: job.data.repository_id,
      cloneUrl,
      branch: job.data.branch,
      token: job.data.token,
    });

    console.log(`[scan-worker] Job ${job.id} completed. Uploaded artifact key: ${result.key}`);
    return result;
  });

  worker.on('failed', (job, err) => {
    console.error(`[scan-worker] Job ${job?.id} failed with error:`, err);
  });

  console.log(`[scan-worker] Worker listening on queue '${QueueName.SCAN}'`);
}

main();
