import {
  startHealthServer,
  initTelemetry,
  createWorker,
  QueueName,
  EventPublisher,
} from '@qa-automater/shared';
import { RepositoryCloner } from './repository-cloner';

initTelemetry('qa-worker-scan');

const VERSION = '0.1.0';
const repositoryCloner = new RepositoryCloner();
const publisher = new EventPublisher();

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
    const scanId = job.data.scan_id || job.data.job_id || String(job.id);
    console.log(
      `[scan-worker] Processing job ${job.id}: ${job.name} for repo ${job.data.full_name}`,
    );
    const cloneUrl = job.data.clone_url || `https://github.com/${job.data.full_name}.git`;

    // 1. Emit CLONING progress event
    await publisher.publish('scan.progress', {
      scan_id: scanId,
      phase: 'CLONING',
      percent: 20,
    });

    const result = await repositoryCloner.cloneAndUpload({
      orgId: job.data.org_id,
      repoId: job.data.repository_id,
      cloneUrl,
      branch: job.data.branch,
      token: job.data.token,
    });

    // 2. Emit PARSING progress event
    await publisher.publish('scan.progress', {
      scan_id: scanId,
      phase: 'PARSING',
      percent: 50,
    });

    // 3. Emit INDEXING progress event
    await publisher.publish('scan.progress', {
      scan_id: scanId,
      phase: 'INDEXING',
      percent: 80,
    });

    console.log(`[scan-worker] Job ${job.id} completed. Uploaded artifact key: ${result.key}`);

    // 4. Emit COMPLETED progress event & scan.complete
    await publisher.publish('scan.progress', {
      scan_id: scanId,
      phase: 'COMPLETED',
      percent: 100,
    });

    await publisher.publish('scan.complete', {
      scan_id: scanId,
      element_count: 0,
    });

    return result;
  });

  worker.on('failed', (job, err) => {
    console.error(`[scan-worker] Job ${job?.id} failed with error:`, err);
    if (job?.data) {
      const scanId = job.data.scan_id || job.data.job_id || String(job.id);
      void publisher.publish('scan.progress', {
        scan_id: scanId,
        phase: 'FAILED',
        percent: 0,
      });
    }
  });

  console.log(`[scan-worker] Worker listening on queue '${QueueName.SCAN}'`);
}

main();
