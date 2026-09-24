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

## 🔔 Class Link Requests

The bot supports a crowdsourced class-link request flow.

### Environment

Add the Telegram channel ID used for public link requests:

```env
LINK_REQUEST_CHANNEL_ID=-1001234567890
```

The bot publishes each new class request to that channel. The channel button opens the bot in private chat with a request-specific `/start` payload. The user sends the link privately, and the link is sent to the supervisors for approval before it becomes a searchable `CourseResource`.

### Rules

- Each user may have at most **5 active link requests**.
- Multiple students requesting the same course + instructor + semester share one request.
- Requesters are not exposed to people submitting links; only the requester count is shown in the channel.
- Once a submitted link is approved, all active requesters are notified and the request is marked fulfilled.
- If an admin deletes an entire semester, both its resources and all link requests for that semester are permanently deleted.
