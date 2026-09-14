# KIAU Hoosh Bot

Telegram bot for managing KIAU course links with PostgreSQL/Prisma.

## Render deployment

Use these Render settings (do not use `npm i @prisma/client@latest` as the build command):

- Environment: **Node**
- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npx prisma migrate deploy && npm run start`
- Health Check Path: `/health`

Required environment variables:

- `BOT_TOKEN`
- `DATABASE_URL`
- `SUPERVISORS_GROUP_ID`
- `ADMIN_ONLY_GROUP_ID`
- `INITIAL_ADMIN_IDS` (comma-separated Telegram IDs; can be empty)
- `NODE_ENV=production`
- `PORT` is supplied by Render; the app defaults to 3000 locally
- `WEBHOOK_DOMAIN` and `WEBHOOK_SECRET` are required together when using webhook mode

The repository contains Prisma migrations. The start command applies them before starting the bot.

## Local development

```bash
npm install
npm run db:generate
npm run typecheck
npm test
npm run build
npm start
```

Never commit `.env` or real bot/database credentials.
