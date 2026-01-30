# Frontend Dockerfile for Next.js
# Multi-stage build for optimized production image

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

COPY package.json pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

RUN pnpm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Standalone output (with outputFileTracingRoot, standalone is in .next/standalone/app)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Move standalone files from app/ subdirectory to root
# With outputFileTracingRoot set to ../../, standalone creates app/ directory
RUN if [ -f ./app/server.js ]; then \
      echo "Moving standalone files from app/ to root..."; \
      # Copy all files from app/ to root, preserving .next directory if it exists
      if [ -d ./.next ]; then mv ./.next ./.next.backup; fi && \
      cp -r ./app/* ./ && \
      cp -r ./app/.* ./ 2>/dev/null || true && \
      # Restore .next if it was overwritten
      if [ -d ./.next.backup ]; then \
        if [ -d ./.next ]; then \
          # Merge .next directories
          cp -r ./.next.backup/* ./.next/ 2>/dev/null || true; \
        else \
          mv ./.next.backup ./.next; \
        fi; \
      fi && \
      rm -rf ./app; \
    fi && \
    # Verify server.js exists
    if [ ! -f ./server.js ]; then \
      echo "ERROR: server.js not found after moving"; \
      ls -la; \
      exit 1; \
    fi && \
    echo "server.js found successfully"

# Copy .next metadata files (BUILD_ID, etc.) and server directory
COPY --from=builder --chown=nextjs:nodejs /app/.next/BUILD_ID ./.next/BUILD_ID
COPY --from=builder --chown=nextjs:nodejs /app/.next/routes-manifest.json ./.next/routes-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/prerender-manifest.json ./.next/prerender-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/images-manifest.json ./.next/images-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/package.json ./.next/package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/build-manifest.json ./.next/build-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/app-build-manifest.json ./.next/app-build-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/app-path-routes-manifest.json ./.next/app-path-routes-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/required-server-files.json ./.next/required-server-files.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/react-loadable-manifest.json ./.next/react-loadable-manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/export-marker.json ./.next/export-marker.json

# Copy .next/server directory from builder (required for pages-manifest.json)
COPY --from=builder --chown=nextjs:nodejs /app/.next/server ./.next/server

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
