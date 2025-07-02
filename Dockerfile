# syntax=docker/dockerfile:1

FROM node:18-alpine AS builder
WORKDIR /app

ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["npm","start"]