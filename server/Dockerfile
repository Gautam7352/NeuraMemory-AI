# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install all dependencies (including devDependencies needed for tsc)
COPY package*.json ./
RUN npm install

# Copy source and compile TypeScript → dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

# Install OCR dependencies (pdftoppm + tesseract)
# We use apt-get for debian-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
