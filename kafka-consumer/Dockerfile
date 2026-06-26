# --- Build Stage ---
FROM node:20-slim AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev

# --- Production Stage ---
FROM node:20-slim
WORKDIR /usr/src/app

# Install wget for health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs appuser

# Copy dependencies from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

# Models directory will be mounted as a volume
RUN mkdir -p models && chown appuser:nodejs models

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:4001/health || exit 1

EXPOSE 4001

CMD ["node", "src/index.js"]