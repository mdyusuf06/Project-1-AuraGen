import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createAuraGenPipeline } from './generator/index.js';

const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

/**
 * HTTP Server for Health Checks & REST API Generation
 */
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'AuraGen Backend', timestamp: new Date().toISOString() }));
    return;
  }

  // Generate Wizard Endpoint
  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const pipeline = await createAuraGenPipeline();
        const result = await pipeline.generateWizard({
          schema: payload.schema,
          frictionContext: payload.frictionContext
        });

        res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, errors: [err.message] }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

/**
 * WebSocket Server for Real-Time Cognitive Load & Wizard Streaming
 */
const wss = new WebSocketServer({ port: Number(WS_PORT) });

wss.on('connection', (ws) => {
  console.log('[AuraGen WebSocket] Client connected.');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`[AuraGen WebSocket] Event received: ${data.type || 'unknown'}`);

      if (data.type === 'GENERATE_WIZARD') {
        const pipeline = await createAuraGenPipeline();
        const result = await pipeline.generateWizard({
          schema: data.schema,
          frictionContext: data.frictionContext
        });

        ws.send(JSON.stringify({
          type: 'WIZARD_GENERATED',
          payload: result
        }));
      } else if (data.type === 'COGNITIVE_LOAD_UPDATE') {
        // Acknowledge cognitive load telemetry
        ws.send(JSON.stringify({
          type: 'COGNITIVE_LOAD_ACK',
          loadScore: data.score || 0,
          status: 'monitored'
        }));
      } else {
        ws.send(JSON.stringify({ type: 'ACK', received: true }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('[AuraGen WebSocket] Client disconnected.');
  });
});

server.listen(Number(PORT), () => {
  console.log(`[AuraGen Backend] HTTP server listening on http://localhost:${PORT}`);
  console.log(`[AuraGen Backend] WebSocket server listening on ws://localhost:${WS_PORT}`);
});

export { server, wss };
