import { Composer, InlineKeyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { env } from '../../config/env.js';
import { SuggestionService } from '../../services/suggestion.service.js';
import { isValidUrl } from '../../utils/text-normalizer.js';

export const suggestComposer = new Composer<CustomContext>();

suggestComposer.hears('📥 پیشنهاد درس جدید', async (ctx): Promise<void> => {
  ctx.session.step = 'SUGGEST_TITLE';
  ctx.session.pendingCourse = {};
  await ctx.reply('جهت ارسال پیشنهاد درس جدید، لطفاً **عنوان درس** را وارد کنید:');
});

suggestComposer.on('message:text', async (ctx, next): Promise<void> => {
  const text = ctx.message.text.trim();

  if (ctx.session.step === 'SUGGEST_TITLE') {
    ctx.session.pendingCourse = { title: text };
    ctx.session.step = 'SUGGEST_INSTRUCTOR';
    await ctx.reply('لطفاً **نام استاد** را وارد کنید:');
    return;
  }

  if (ctx.session.step === 'SUGGEST_INSTRUCTOR') {
    ctx.session.pendingCourse = { ...ctx.session.pendingCourse, instructor: text };
    ctx.session.step = 'SUGGEST_SEMESTER';
    await ctx.reply('لطفاً **نیم‌سال تحصیلی** را وارد کنید (مثال: 4031):');
    return;
  }

  if (ctx.session.step === 'SUGGEST_SEMESTER') {
    ctx.session.pendingCourse = { ...ctx.session.pendingCourse, semester: text };
    ctx.session.step = 'SUGGEST_LINK';
    await ctx.reply('لطفاً **لینک مرجع درس** را وارد کنید:');
    return;
  }

  if (ctx.session.step === 'SUGGEST_LINK') {
    if (!isValidUrl(text)) {
      await ctx.reply('❌ لینک وارد شده نامعتبر است. لطفاً لینک کامل همراه با http/https ارسال کنید:');
      return;
    }

    const suggestionData = {
      title: ctx.session.pendingCourse?.title!,
      instructor: ctx.session.pendingCourse?.instructor!,
      semester: ctx.session.pendingCourse?.semester!,
      link: text,
      submittedById: ctx.dbUser.id,
    };

    const suggestion = await SuggestionService.createSuggestion(suggestionData);

    // Broadcast to Supervisors Group
    const supervisorButtons = new InlineKeyboard()
      .text('✅ تایید و افزودن', `approve_suggestion:${suggestion.id}`)
      .text('❌ رد پیشنهاد', `reject_suggestion:${suggestion.id}`);

    await ctx.api.sendMessage(
      Number(env.SUPERVISORS_GROUP_ID),
      `📥 **پیشنهاد درس جدید دریافت شد**\n\n` +
        `👤 **فرستنده:** ${ctx.from.first_name} (@${ctx.from.username || 'بدون_آیدی'})\n` +
        `🆔 **شناسه عددی:** \`${ctx.from.id}\` \n\n` +
        `📚 **عنوان:** ${suggestion.title}\n` +
        `👨‍🏫 **استاد:** ${suggestion.instructor}\n` +
        `📅 **نیم‌سال:** ${suggestion.semester}\n` +
        `🔗 **لینک:** ${suggestion.link}`,
      { reply_markup: supervisorButtons, parse_mode: 'Markdown' }
    );

    ctx.session.step = 'IDLE';
    ctx.session.pendingCourse = undefined;
    await ctx.reply('✅ پیشنهاد شما با موفقیت ثبت شد و برای ناظران ارسال گردید. با تشکر!');
    return;
  }

  await next();
  return;
});
