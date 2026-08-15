# =============================================================================
# Voice worker container
#
# Runs the long-lived OpenAI Realtime WebSocket sessions that serverless hosts
# cannot hold open. Deploy to any persistent Node host — Railway, Render,
# Fly.io, ECS, a plain VM. Nothing here is provider-specific.
# =============================================================================

# ---- Build ------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install only what the worker needs, using the workspace lockfile.
COPY package.json package-lock.json ./
COPY apps/voice-worker/package.json apps/voice-worker/
RUN npm ci --workspace=@afd/voice-worker --include-workspace-root

COPY tsconfig.base.json ./
COPY apps/voice-worker apps/voice-worker

RUN npm run build --workspace=@afd/voice-worker

# ---- Runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

# Run unprivileged.
RUN addgroup -S worker && adduser -S worker -G worker

COPY --from=build --chown=worker:worker /app/node_modules ./node_modules
COPY --from=build --chown=worker:worker /app/package.json ./package.json
COPY --from=build --chown=worker:worker /app/apps/voice-worker/dist ./apps/voice-worker/dist
COPY --from=build --chown=worker:worker /app/apps/voice-worker/package.json ./apps/voice-worker/package.json

USER worker
EXPOSE 8787

# The orchestrator restarts the container if this fails.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/voice-worker/dist/index.js"]
