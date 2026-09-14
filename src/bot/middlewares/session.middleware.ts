import { Middleware } from 'grammy';
import { CustomContext, SessionData } from '../../types/context.js';
import { prisma } from '../../database/prisma.js';
export const dbSessionMiddleware: Middleware<CustomContext> = async (ctx,next) => { const chatId=ctx.chat?.id,userId=ctx.from?.id; if(!chatId||!userId)return next(); const key=`session:${chatId}:${userId}`; const row=await prisma.botSession.findUnique({where:{key}}); let data:SessionData={step:'IDLE'}; if(row)try{data=JSON.parse(row.value) as SessionData;}catch{} ctx.session=data; try { await next(); } finally { await prisma.botSession.upsert({where:{key},update:{value:JSON.stringify(ctx.session),userId:BigInt(userId)},create:{key,value:JSON.stringify(ctx.session),userId:BigInt(userId)}}); } };
