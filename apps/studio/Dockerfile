# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copiar manifests primero para aprovechar caché de capas
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/*/package.json packages/
# Copiar package.json de cada overlay (necesarios para workspace:)
COPY packages/asset-manager/package.json packages/asset-manager/
COPY packages/core/package.json packages/core/
COPY packages/design-system/package.json packages/design-system/
COPY packages/event-bus/package.json packages/event-bus/
COPY packages/event-engine/package.json packages/event-engine/
COPY packages/game-engine/package.json packages/game-engine/
COPY packages/layout-manager/package.json packages/layout-manager/
COPY packages/overlay-manager/package.json packages/overlay-manager/
COPY packages/scene-engine/package.json packages/scene-engine/
COPY packages/sponsor-engine/package.json packages/sponsor-engine/
COPY packages/overlays/announcement/package.json packages/overlays/announcement/
COPY packages/overlays/batter/package.json packages/overlays/batter/
COPY packages/overlays/countdown/package.json packages/overlays/countdown/
COPY packages/overlays/final-score/package.json packages/overlays/final-score/
COPY packages/overlays/game-event/package.json packages/overlays/game-event/
COPY packages/overlays/inning-transition/package.json packages/overlays/inning-transition/
COPY packages/overlays/lineup/package.json packages/overlays/lineup/
COPY packages/overlays/next-batters/package.json packages/overlays/next-batters/
COPY packages/overlays/pitcher/package.json packages/overlays/pitcher/
COPY packages/overlays/scorebug/package.json packages/overlays/scorebug/
COPY packages/overlays/social-lower-third/package.json packages/overlays/social-lower-third/
COPY packages/overlays/sponsor-break/package.json packages/overlays/sponsor-break/
COPY packages/overlays/substitution/package.json packages/overlays/substitution/
COPY apps/studio/package.json apps/studio/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copiar código fuente completo y compilar
COPY . .
RUN pnpm turbo build --filter=@playflow/studio...

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copiar workspace completo con deps instaladas y código compilado
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/studio ./apps/studio

EXPOSE 8080

# El Vite build (dist/) se sirve como estáticos desde el servidor Node
WORKDIR /app/apps/studio
CMD ["/app/node_modules/.bin/tsx", "server/index.ts"]
