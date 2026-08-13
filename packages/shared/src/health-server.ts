import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { HealthCheckResponse, ServiceName } from '@qa-automater/types';
import { createHealthResponse } from './index';

export interface HealthServerOptions {
  service: ServiceName;
  version: string;
  port?: number;
}

export function startHealthServer(options: HealthServerOptions): void {
  const port = options.port ?? Number(process.env.PORT ?? 8080);

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health' && req.method === 'GET') {
      const body: HealthCheckResponse = createHealthResponse(options.service, options.version);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(port, () => {
    console.log(`[${options.service}] health server listening on :${port}`);
  });
}
