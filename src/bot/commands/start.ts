import { Composer, Keyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';

export const startComposer = new Composer<CustomContext>();

startComposer.command('start', async (ctx) => {
  ctx.session.step = 'IDLE';

  const keyboard = new Keyboard()
    .text('🔍 جستجوی درس')
    .text('📥 پیشنهاد درس جدید')
    .row()
    .text('📚 مشاهده دروس اخیر')
    .text('❓ راهنما');

  if (ctx.userRole === 'ADMIN' || ctx.userRole === 'SUPERVISOR') {
    keyboard.row().text('⚙️ پنل مدیریت');
  }

  await ctx.reply(
    `سلام ${ctx.from?.first_name || 'دانشجو'} عزیز! 👋\n\nبه ربات **کیاهوش (KIAU Hoosh)** خوش آمدید.\nسامانه جامع اشتراک‌گذاری و جستجوی لینک‌های درسی دانشگاه آزاد اسلامی واحد کرج.\n\nاز منوی زیر جهت استفاده از امکانات ربات انتخاب کنید:`,
    {
      reply_markup: keyboard.resized(),
      parse_mode: 'Markdown',
    }
  );
});
