# syntax=docker/dockerfile:1.7

# ---------- Build: install deps and produce the static bundle ----------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first, so this layer is cached until package*.json change.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- Runtime: tiny, non-root Nginx serving dist/ ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="Renotion" \
      org.opencontainers.image.description="3D home renovation planner" \
      org.opencontainers.image.source="https://github.com/TonyW-Y/Renotion"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# The unprivileged image runs as uid 101 and listens on 8080.
USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
