FROM node:20-alpine AS base

# Stage 1: Prune the workspace for frontend
FROM base AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
COPY . .
# Generate a partial monorepo with only the frontend and its dependencies
RUN pnpm dlx turbo prune frontend --docker

# Stage 2: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# Copy only the pruned lockfile and package.json(s)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies (respecting the lockfile)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Stage 3: Build the application
FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .

# Set environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL

# Build using turbo (but effectively running next build for frontend)
RUN pnpm run build

# Stage 4: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Standalone output (with outputFileTracingRoot, standalone is in .next/standalone)
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./.next/static

# Move standalone files from apps/frontend/ subdirectory to root
# Because outputFileTracingRoot is set to monorepo root, standalone output preserves the folder structure apps/frontend
RUN if [ -d ./apps/frontend ]; then \
      echo "Moving standalone files from apps/frontend/ to root..."; \
      # Copy all files from apps/frontend/ to root, preserving .next directory if it exists
      if [ -d ./.next ]; then mv ./.next ./.next.backup; fi && \
      cp -r ./apps/frontend/* ./ && \
      cp -r ./apps/frontend/.* ./ 2>/dev/null || true && \
      # Restore .next if it was overwritten or merge
      if [ -d ./.next.backup ]; then \
        if [ -d ./.next ]; then \
          cp -r ./.next.backup/* ./.next/ 2>/dev/null || true; \
        else \
          mv ./.next.backup ./.next; \
        fi; \
      fi && \
      rm -rf ./apps; \
    fi && \
    # Verify server.js exists
    if [ ! -f ./server.js ]; then \
      echo "ERROR: server.js not found after moving"; \
      ls -la; \
      exit 1; \
    fi && \
    echo "server.js found successfully"

# Copy .next metadata files (BUILD_ID, etc.) and server directory
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/BUILD_ID ./.next/BUILD_ID
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/routes-manifest.json ./.next/routes-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/prerender-manifest.json ./.next/prerender-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/images-manifest.json ./.next/images-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/package.json ./.next/package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/build-manifest.json ./.next/build-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/app-build-manifest.json ./.next/app-build-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/app-path-routes-manifest.json ./.next/app-path-routes-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/required-server-files.json ./.next/required-server-files.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/react-loadable-manifest.json ./.next/react-loadable-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/export-marker.json ./.next/export-marker.json

# Copy .next/server directory from builder (required for pages-manifest.json)
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/server ./.next/server

# Ensure nextjs user has write permissions to .next directory (required for image cache)
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
