FROM node:22-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --force --ignore-scripts
COPY src ./src
RUN npx tsc

FROM node:22-bookworm-slim
RUN useradd --system --uid 10001 --create-home better-codex
WORKDIR /app
COPY --from=build /src/dist ./dist
RUN mkdir /data && chown better-codex:better-codex /data
USER better-codex
ENV BETTER_CODEX_HUB_HOST=0.0.0.0 \
    BETTER_CODEX_HUB_PORT=4318 \
    BETTER_CODEX_HUB_DB=/data/better-codex-hub.db \
    BETTER_CODEX_HUB_ADMIN_TOKEN_FILE=/run/secrets/admin_token
EXPOSE 4318
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:4318/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/hub-cli.js"]
