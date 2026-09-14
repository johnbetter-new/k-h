import { Composer, Keyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';
export const startComposer=new Composer<CustomContext>();
startComposer.command('start',async ctx=>{ctx.session.step='IDLE';const k=new Keyboard().text('🔍 جستجوی درس').text('📥 پیشنهاد درس جدید').row().text('📚 مشاهده دروس اخیر').text('❓ راهنما');if(ctx.userRole==='ADMIN'||ctx.userRole==='SUPERVISOR')k.row().text('⚙️ پنل مدیریت');await ctx.reply(`سلام ${ctx.from?.first_name||'دانشجو'} عزیز! 👋\n\nبه ربات کیاهوش (KIAU Hoosh) خوش آمدید.`,{reply_markup:k.resized()});});
startComposer.hears('❓ راهنما',async ctx=>ctx.reply('🔍 جستجو: نام درس، استاد یا نیم‌سال را وارد کنید.\n📥 پیشنهاد: درس جدید را برای بررسی ارسال کنید.\n📚 دروس اخیر: آخرین درس‌های ثبت‌شده را ببینید.\nبرای شروع دوباره از /start استفاده کنید.'));
