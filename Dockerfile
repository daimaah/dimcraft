# ---- build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# install dependencies first for better layer caching
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/dimcrochet/package.json apps/dimcrochet/
RUN npm ci --no-audit --no-fund

# build the production bundle (includes typechecking)
COPY . .
RUN npm run build

# ---- runtime stage ---------------------------------------------------------
# One Node process serves both the app and the self-hosted encrypted
# short-link sidecar (POST/GET /api/links, /x/<id> receive route).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80 DATA_DIR=/data DIST_DIR=/app/dist DIMCROCHET_MAX_AGE_HOURS=720
COPY sidecar/server.mjs ./sidecar/server.mjs
COPY --from=build /app/apps/dimcrochet/dist ./dist
VOLUME /data
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "sidecar/server.mjs"]
