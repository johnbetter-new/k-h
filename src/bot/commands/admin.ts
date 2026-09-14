import { Composer } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { env } from '../../config/env.js';
import { isAdmin } from '../../auth/roles.js';
export const adminComposer = new Composer<CustomContext>();
adminComposer.hears('⚙️ پنل مدیریت', async (ctx): Promise<void> => {
  if (!isAdmin(ctx.userRole)) { await ctx.reply('⛔ شما دسترسی لازم برای ورود به پنل مدیریت را ندارید.'); return; }
  if (!ctx.chat || BigInt(ctx.chat.id) !== env.ADMIN_ONLY_GROUP_ID) { await ctx.reply('⛔ اجرای این فرآیند فقط در گروه مدیریت مجاز است.'); return; }
  ctx.session.step='ADD_COURSE_TITLE'; ctx.session.pendingCourse={};
  await ctx.reply('⚙️ ورود به فرآیند افزودن درس جدید\n\nلطفاً عنوان درس را وارد نمایید:');
  return;
});
