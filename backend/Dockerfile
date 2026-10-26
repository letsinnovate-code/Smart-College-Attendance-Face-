# ========================================================
# Production Dockerfile for Smart College Attendance Backend
# Multi-stage build with non-root security principles
# ========================================================

# Stage 1: Build & Prune Dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies for native modules (sharp, argon2)
RUN apk add --no-cache python3 make g++ vips-dev

COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

COPY . .

# Prune dev dependencies for lean final runtime
RUN npm prune --production

# Stage 2: Runtime Image
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=3000

# Install runtime dependencies for sharp / vips
RUN apk add --no-cache vips dumb-init curl

# Copy pruned production node_modules and application code
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/scripts ./scripts
COPY --from=builder /usr/src/app/docs ./docs

# Create non-root ownership
RUN chown -R node:node /usr/src/app

# Switch to non-root user
USER node

EXPOSE 3000

# Container liveness health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health/live || exit 1

# dumb-init handles PID 1 signal forwarding properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
