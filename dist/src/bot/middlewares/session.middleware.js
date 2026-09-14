"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbSessionMiddleware = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const dbSessionMiddleware = async (ctx, next) => { const chatId = ctx.chat?.id, userId = ctx.from?.id; if (!chatId || !userId)
    return next(); const key = `session:${chatId}:${userId}`; const row = await prisma_js_1.prisma.botSession.findUnique({ where: { key } }); let data = { step: 'IDLE' }; if (row)
    try {
        data = JSON.parse(row.value, (_k, v) => typeof v === 'string' && /^bigint:\d+$/.test(v) ? BigInt(v.slice(7)) : v);
    }
    catch { } ctx.session = data; try {
    await next();
}
finally {
    await prisma_js_1.prisma.botSession.upsert({ where: { key }, update: { value: JSON.stringify(ctx.session, (_k, v) => typeof v === 'bigint' ? `bigint:${v}` : v), userId: BigInt(userId) }, create: { key, value: JSON.stringify(ctx.session, (_k, v) => typeof v === 'bigint' ? `bigint:${v}` : v), userId: BigInt(userId) } });
} };
exports.dbSessionMiddleware = dbSessionMiddleware;
