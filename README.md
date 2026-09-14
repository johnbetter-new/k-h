# KIAU Hoosh Bot

Telegram bot for course-link search and moderated course suggestions.

## Setup
1. Copy `.env.example` to `.env` and fill every value with your own secrets.
2. Run `npm install`.
3. Run `npx prisma migrate deploy` (or `npm run db:dev-migrate` during local development).
4. Run `npm run build` and `npm start`.

## Railway
Set the same environment variables in Railway. `railway.json` runs Prisma migrations before starting the compiled application. Never commit real tokens or database credentials.

## Quality commands
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
