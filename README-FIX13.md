# KIAU Hoosh - Fixed13

Fixes the link-request registration error caused by calling `getMe()` through `api.api` instead of the grammY Api instance (`api.getMe()`).

If the Render database has not yet applied the link-request migration, deploy with the existing start command so `prisma migrate deploy` runs.
