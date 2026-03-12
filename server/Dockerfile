# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies needed for tsc)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript → dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
