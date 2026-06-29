import 'dotenv/config';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapSysAdmin } from './auth/bootstrapService';

import cors, { type CorsOptions } from 'cors';
import express, { type Request, type Response } from 'express';

import clubsRouter from './clubsRouter';
import categoriesRouter from './categoriesRouter';
import { handleCommand, parseCommandRequest } from './commandHandler';
import { gameConfigRouter } from './gameConfigRouter';
import { layoutRouter } from './layoutRouter';
import leaguesTournamentsRouter from './leaguesTournamentsRouter';
import { matchMetadataRouter } from './matchMetadataRouter';
import { lineupRouter } from './lineupRouter';
import pitchesRouter from './pitchesRouter';
import { baserunningRouter } from './baserunningRouter';
import apiV1Router from './apiV1Router';
import devicesRouter from './devicesRouter';
import exportRouter from './exportRouter';
import lifecycleRouter from './lifecycleRouter';
import { scorerRouter } from './scorerRouter';
import sponsorsRouter from './sponsorsRouter';
import { stateStore } from './stateStore';
import teamsRouter from './teamsRouter';
import venuesRouter from './venuesRouter';
import { attachWebSocketServer } from './wsServer';
import authRouter from './auth/authRouter';
import securityRouter from './authorization/securityRouter';
import { loadPolicy } from './authorization/policyLoader';
import { usersRouter } from './users/usersRouter';
import { auditRouter } from './audit/auditRouter';
import { scoringRouter } from './scoring/scoringRouter';
import { startRetentionScheduler } from './audit/auditRetentionJob';
import adminRouter from './admin/adminRouter';
import { startRateLimitCleanup } from './auth/rateLimitMiddleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    name: typeof parsed.name === 'string' ? parsed.name : 'studio',
    version: typeof parsed.version === 'string' ? parsed.version : '0.0.0',
  };
}

function getCorsOptions(): CorsOptions {
  const allowedOrigins = new Set(
    ['http://localhost:5173', 'http://localhost:5174', process.env.ALLOWED_ORIGIN].filter(Boolean) as string[],
  );
  const isProd = process.env.NODE_ENV === 'production';

  return {
    origin(origin, callback) {
      // En producción solo same-origin (no origin) o allowedOrigins explícitos
      if (!origin || allowedOrigins.has(origin) || !isProd) {
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

// Auth router (rutas públicas y protegidas)
app.use('/api/auth', authRouter);
// Security — rutas de autorización, context y step-up
app.use('/api/security', securityRouter);
app.use('/api/auth', securityRouter); // step-up y mfa comparten prefijo /api/auth
// Admin — rutas protegidas con autorización
app.use('/api/admin', adminRouter);
// Users & Roles (Fase 3)
app.use('/api/users', usersRouter);
// Scoring Assignments (Fase 4)
app.use('/api/scoring', scoringRouter);
// Audit (Fase 5)
app.use('/api/audit', auditRouter);

app.use('/api/baserunning-events', baserunningRouter);
app.use('/api', clubsRouter);
app.use('/api', categoriesRouter);
app.use('/api', gameConfigRouter);
app.use('/api/v1/devices', devicesRouter);
app.use('/api/v1', apiV1Router);
app.use('/api/v1', exportRouter);
app.use('/api/v1/lifecycle', lifecycleRouter);
app.use('/api', layoutRouter);
app.use('/api', lineupRouter);
app.use('/api', leaguesTournamentsRouter);
app.use('/api', matchMetadataRouter);
app.use('/api', pitchesRouter);
app.use('/api', scorerRouter);
app.use('/api', sponsorsRouter);
app.use('/api', teamsRouter);
app.use('/api', venuesRouter);

// Assets locales: storage/assets/ → /assets/*
// En producción se usa ASSETS_BASE_URL apuntando a Azure Blob Storage.
const localAssetsPath = path.resolve(__dirname, '../storage/assets');
app.use('/assets', express.static(localAssetsPath, { extensions: ['jpg', 'png', 'webp', 'jpeg', 'gif', 'svg'] }));

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

// En producción (Docker) el server sirve el Vite build como archivos estáticos.
// En dev, Vite corre por separado en :5173.
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  // SPA fallback: todas las rutas que no sean /api van al index.html
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

import { execSync } from 'child_process';

const port = Number(process.env.PORT ?? 3001);

// Liberar el puerto si está ocupado antes de iniciar
function freePort(p: number): void {
  try {
    const pids = execSync(`lsof -ti :${p}`, { encoding: 'utf8' }).trim();
    if (pids) {
      pids.split('\n').forEach((pid) => {
        try { process.kill(Number(pid), 'SIGKILL'); } catch { /* ya terminó */ }
      });
      console.log(`[BOOT] Puerto ${p} liberado (PIDs: ${pids.replace(/\n/g, ', ')})`);
    }
  } catch {
    // lsof no encontró nada — puerto libre
  }
}

freePort(port);

// Restaurar estado desde DB + bootstrap de seguridad antes de abrir el puerto
Promise.all([
  stateStore.init(),
  bootstrapSysAdmin(),
]).finally(() => {
  loadPolicy(); // cargar política en memoria al arrancar
  startRetentionScheduler(); // job de retención de audit logs (24 h)
  startRateLimitCleanup(); // cleanup automático de rate limit (cada 10 min)
  server.listen(port, () => {
    console.log(`PlayFlow server listening on http://localhost:${port}`);
  });
});
