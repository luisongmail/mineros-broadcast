import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

import cors, { type CorsOptions } from 'cors';
import express, { type Request, type Response } from 'express';

import { handleCommand, parseCommandRequest } from './commandHandler';
import { stateStore } from './stateStore';
import { attachWebSocketServer } from './wsServer';

interface ServerMetadata {
  name: string;
  version: string;
  overlays: string[];
  websocket: {
    protocol: 'ws';
    samePort: true;
  };
}

interface ApiSuccessResponse {
  status: number;
  result: 'ok';
  payload: unknown;
}

interface ApiErrorResponse {
  status: number;
  result: 'error';
  payload: {
    message: string;
  };
}

function readPackageMetadata(): Pick<ServerMetadata, 'name' | 'version'> {
  const packageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  const parsed = JSON.parse(packageJson) as { name?: unknown; version?: unknown };

  return {
    name: typeof parsed.name === 'string' ? parsed.name : 'overlay-server',
    version: typeof parsed.version === 'string' ? parsed.version : '0.0.0',
  };
}

function getCorsOptions(): CorsOptions {
  const allowedOrigins = new Set(['http://localhost:5173', 'http://localhost:5174']);
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isDev) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  };
}

function setCompatibilityHeaders(response: Response): void {
  response.setHeader(
    'X-Singular-Ratelimit-Burst-Calls',
    JSON.stringify({
      limit: 50,
      remaining: 49,
      reset: Date.now() + 60_000,
    }),
  );
}

function sendSuccess(response: Response, payload: unknown): void {
  const body: ApiSuccessResponse = {
    status: 200,
    result: 'ok',
    payload,
  };

  response.status(200).json(body);
}

function sendError(response: Response, error: unknown): void {
  const body: ApiErrorResponse = {
    status: 400,
    result: 'error',
    payload: {
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  };

  response.status(200).json(body);
}

const packageMetadata = readPackageMetadata();
const app = express();

app.use(cors(getCorsOptions()));
app.use(express.json());
app.use((_request, response, next) => {
  setCompatibilityHeaders(response);
  next();
});

app.put('/api/command', (request: Request, response: Response) => {
  try {
    const { command, value } = parseCommandRequest(request.body as unknown);
    const result = handleCommand(command, value);
    sendSuccess(response, result.payload);
  } catch (error) {
    sendError(response, error);
  }
});

app.get('/api/state', (_request: Request, response: Response) => {
  sendSuccess(response, stateStore.getState());
});

app.get('/api/info', (_request: Request, response: Response) => {
  const payload: ServerMetadata = {
    ...packageMetadata,
    overlays: stateStore.getAvailableOverlays(),
    websocket: {
      protocol: 'ws',
      samePort: true,
    },
  };

  sendSuccess(response, payload);
});

const server = createServer(app);
attachWebSocketServer(server);

const port = Number(process.env.PORT ?? 3001);

server.listen(port, () => {
  console.log(`Overlay server listening on http://localhost:${port}`);
});
