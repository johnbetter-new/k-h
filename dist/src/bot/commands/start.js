"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startComposer = void 0;
const grammy_1 = require("grammy");
exports.startComposer = new grammy_1.Composer();
exports.startComposer.command('start', async (ctx) => { ctx.session.step = 'IDLE'; const k = new grammy_1.Keyboard().text('🔍 جستجوی درس').text('📥 پیشنهاد درس جدید').row().text('➕ ثبت لینک جدید').text('📚 مشاهده دروس اخیر').row().text('❓ راهنما'); if (ctx.userRole === 'ADMIN' || ctx.userRole === 'SUPERVISOR')
    k.row().text('⚙️ پنل مدیریت'); await ctx.reply(`سلام ${ctx.from?.first_name || 'دانشجو'} عزیز! 👋\n\nبه ربات کیاهوش (KIAU Hoosh) خوش آمدید.`, { reply_markup: k.resized() }); });
exports.startComposer.hears('❓ راهنما', async (ctx) => ctx.reply('🔍 جستجو: نام درس، استاد یا نیم‌سال را وارد کنید.\n📥 پیشنهاد: درس جدید را برای بررسی ارسال کنید.\n➕ ثبت لینک جدید: یک لینک را به درس موجود اضافه کنید.\n📚 دروس اخیر: آخرین درس‌های ثبت‌شده را ببینید.\nبرای شروع دوباره از /start استفاده کنید.'));
