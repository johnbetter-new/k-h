import { Composer } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { env } from '../../config/env.js';

export const adminComposer = new Composer<CustomContext>();

adminComposer.hears('⚙️ پنل مدیریت', async (ctx) => {
  if (ctx.userRole !== 'ADMIN' && ctx.userRole !== 'SUPERVISOR') {
    return ctx.reply('⛔ شما دسترسی لازم برای ورود به پنل مدیریت را ندارید.');
  }

  // Admin Group Authorization check
  if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
    if (BigInt(ctx.chat.id) !== env.ADMIN_ONLY_GROUP_ID && BigInt(ctx.chat.id) !== env.SUPERVISORS_GROUP_ID) {
      return ctx.reply('⛔ اجرای دستورات مدیریتی تنها در گروه مجاز امکان‌پذیر است.');
    }
  }

  ctx.session.step = 'ADD_COURSE_TITLE';
  ctx.session.pendingCourse = {};

  await ctx.reply('⚙️ **ورود به فرآیند افزودن درس جدید**\n\nلطفاً عنوان درس را وارد نمایید:');
});
