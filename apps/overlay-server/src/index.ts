import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { buildErrorEnvelope } from './middleware/validateIC003';
import { createAuthRouter } from './routes/auth';
import { createOverlayRouter } from './routes/overlay';
import { OverlayStateService } from './services/overlayStateService';
import { SupabaseRealtimeService } from './services/supabaseRealtime';
import type { OverlaySnapshotEnvelope } from './types';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const server = http.createServer(app);
const websocketServer = new WebSocketServer({ noServer: true });
const clients = new Set<WebSocket>();
const overlayStateService = new OverlayStateService();

function broadcastSnapshot(snapshot: OverlaySnapshotEnvelope): void {
  const message = JSON.stringify(snapshot);

  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

const supabaseRealtime = new SupabaseRealtimeService({
  channelName: 'overlay-server-events',
  onSnapshot: (snapshot) => {
    broadcastSnapshot(snapshot);
  },
});

async function publishLatestSnapshot(correlationId: string): Promise<void> {
  const snapshot = await overlayStateService.getSnapshotEnvelope(correlationId);
  const published = await supabaseRealtime.publishSnapshot(snapshot);

  if (!published) {
    broadcastSnapshot(snapshot);
  }
}

app.use(express.json());
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'overlay-server',
    port,
  });
});

app.use('/api/v1/auth', createAuthRouter());
app.use(
  '/api/v1/control',
  createOverlayRouter({
    stateService: overlayStateService,
    publishSnapshot: publishLatestSnapshot,
  }),
);
app.use(
  '/api/v1/overlay',
  createOverlayRouter({
    stateService: overlayStateService,
    publishSnapshot: publishLatestSnapshot,
  }),
);

app.use(notFoundHandler);
app.use(errorHandler);

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/ws', 'http://localhost');

  if (url.pathname !== '/ws' && url.pathname !== '/ws/overlay-events') {
    socket.destroy();
    return;
  }

  websocketServer.handleUpgrade(request, socket, head, (ws) => {
    websocketServer.emit('connection', ws, request);
  });
});

websocketServer.on('connection', (socket) => {
  clients.add(socket);

  void (async () => {
    try {
      const snapshot = await overlayStateService.getSnapshotEnvelope(`corr-snapshot-${Date.now()}`);

      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(snapshot));
      }
    } catch (error) {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(
          buildErrorEnvelope(
            'OverlayClients',
            `corr-overlay-ws-error-${Date.now()}`,
            'VALIDATION_ERROR',
            error instanceof Error ? error.message : 'No se pudo cargar el snapshot inicial.',
          ),
        ));
      }
    }
  })();

  socket.on('close', () => {
    clients.delete(socket);
  });
});

void supabaseRealtime.start();

server.listen(port, () => {
  console.log(`[overlay-server] Servidor iniciado en http://localhost:${port}`);
});
