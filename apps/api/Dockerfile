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

# The resource seed is idempotent. A fresh hosted database therefore becomes
# committee-ready after migrations without a separate manual seeding step.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed:resources && node dist/main"]
