FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
# Keep the Prisma CLI in the image because deployment startup applies committed
# migrations before the API is exposed. This is intentionally reproducible.
RUN npm ci --include=dev

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npx prisma generate

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Production bootstrap is idempotent: committed migrations are applied first,
# university resources are refreshed safely, then the configured administrative
# accounts are guaranteed to exist before the API starts accepting traffic.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed:resources && npm run seed:admin && node dist/main"]
