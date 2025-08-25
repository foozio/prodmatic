# Production Dockerfile for ProdMatic
# Multi-stage build for optimal image size and security

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN corepack enable pnpm && \
    pnpm config set store-dir ~/.pnpm-store && \
    pnpm install --frozen-lockfile --prod=false

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN corepack enable pnpm && \
    pnpm build

# =============================================================================
# Stage 3: Runner (Production)
# =============================================================================
FROM node:18-alpine AS runner

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    openssl \
    ca-certificates && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built Next.js application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for database operations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Create uploads directory for file uploads (if using local storage)
RUN mkdir -p ./uploads && chown nextjs:nodejs ./uploads

# Create health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3000/api/health || exit 1' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

# Set user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD /healthcheck.sh

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# =============================================================================
# Build arguments and labels
# =============================================================================
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="prodmatic" \
      org.label-schema.description="Production-Ready Product Management Platform" \
      org.label-schema.url="https://github.com/your-username/prodmatic" \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.vcs-url="https://github.com/your-username/prodmatic" \
      org.label-schema.vendor="ProdMatic Team" \
      org.label-schema.version=$VERSION \
      org.label-schema.schema-version="1.0"