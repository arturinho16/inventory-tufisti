FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencias

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS construccion

ENV DATABASE_URL=postgresql://compilacion:compilacion@127.0.0.1:5432/compilacion

COPY --from=dependencias /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

FROM dependencias AS migraciones

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS programador

COPY scripts/*.mjs ./scripts/

CMD ["node", "scripts/programador-respaldos.mjs"]

FROM python:3.12-slim-bookworm AS proveedor-ftf

WORKDIR /app
RUN pip install --no-cache-dir "scrapling[fetchers]>=0.4,<0.5"
COPY scripts/ftf_provider.py ./scripts/ftf_provider.py
EXPOSE 8080
CMD ["python", "scripts/ftf_provider.py"]

FROM base AS produccion

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=construccion --chown=nextjs:nodejs /app/public ./public
COPY --from=construccion --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=construccion --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/public/imagenes/productos /app/datos/respaldos-programados /app/.datos/importaciones \
    && chown -R nextjs:nodejs /app/public/imagenes/productos /app/datos /app/.datos

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
