# Stage 1: Build NestJS application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package lists and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build NestJS production bundle
COPY . .
RUN npm run build

# Stage 2: Production runtime environment
FROM node:20-alpine

WORKDIR /app

# Copy package lists and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript files and public folder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose microservice port
EXPOSE 3000

# Run NestJS application
CMD ["node", "dist/main"]
