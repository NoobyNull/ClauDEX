import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from './routes.js';
import { createLogger } from '../shared/logger.js';

const log = createLogger('web:server');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(res: http.ServerResponse, urlPath: string): void {
  const pluginRoot = process.env['ENGRAM_PLUGIN_ROOT'] || '';
  const publicDir = path.join(pluginRoot, 'web', 'public');
  let filePath = urlPath === '/' ? '/index.html' : urlPath;

  // Security: prevent path traversal
  const resolved = path.resolve(publicDir, '.' + filePath);
  if (!resolved.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const content = fs.readFileSync(resolved);
    const ext = path.extname(resolved);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

export function startWebServer(port: number): void {
  // Probe the port first — if another Engram instance already owns
  // the web UI, skip silently so we don't spam error logs.
  const probe = http.createServer();
  probe.once('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      log.info(`Web UI already running on port ${port} (another session owns it)`);
    } else {
      log.warn('Web server probe error', err);
    }
  });
  probe.once('listening', () => {
    // Port is free — close the probe and start the real server.
    probe.close(() => startRealServer(port));
  });
  probe.listen(port, '127.0.0.1');
}

function startRealServer(port: number): void {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || '/';

    try {
      if (url.startsWith('/api/')) {
        await handleApiRequest(req, res);
      } else {
        serveStatic(res, url);
      }
    } catch (err) {
      log.error('Request error', { url, error: err });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  server.listen(port, '127.0.0.1', () => {
    log.info(`Web UI available at http://127.0.0.1:${port}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      log.info(`Port ${port} taken while starting — another session claimed it`);
    } else {
      log.warn('Web server error', err);
    }
  });
}
