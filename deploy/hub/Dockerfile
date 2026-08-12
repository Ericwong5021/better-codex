FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npx tsc

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    BETTER_CODEX_HUB_HOST=0.0.0.0 \
    BETTER_CODEX_HUB_PORT=4318 \
    BETTER_CODEX_HUB_DB=/data/better-codex-hub.db
WORKDIR /app
RUN mkdir -p /data && chown node:node /data
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY assets ./assets
COPY package.json ./package.json
COPY deploy/hub/entrypoint.sh /usr/local/bin/better-codex-hub-entrypoint
RUN chmod 0755 /usr/local/bin/better-codex-hub-entrypoint
EXPOSE 4318
ENTRYPOINT ["/usr/local/bin/better-codex-hub-entrypoint"]
CMD ["node", "dist/hub-cli.js", "serve"]
