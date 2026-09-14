import { Composer } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { SuggestionService } from '../../services/suggestion.service.js';
import { isSupervisorOrAdmin } from '../../auth/roles.js';

export const suggestionCallbackComposer = new Composer<CustomContext>();

suggestionCallbackComposer.callbackQuery(/^approve_suggestion:(.+)$/, async (ctx): Promise<void> => {
  if (!isSupervisorOrAdmin(ctx.userRole)) {
    await ctx.answerCallbackQuery({ text: '⛔ عدم دسترسی کافی', show_alert: true });
    return;
  }

  const suggestionId = ctx.match[1]!;

  try {
    const { updatedSuggestion, duplicateMatch } = await SuggestionService.approveSuggestion(
      suggestionId,
      ctx.dbUser.id
    );

    let resultMsg = `✅ **پیشنهاد با موفقیت تایید و به بانک اطلاعاتی اضافه شد.**`;
    if (duplicateMatch.isDuplicate) {
      resultMsg += `\n\n⚠️ **تذکر:** این درس طبق الگوریتم هوشمند، با یک درس موجود شباهت داشت.`;
    }

    await ctx.editMessageText(resultMsg, { parse_mode: 'Markdown' });

    // Notify original Submitter
    await ctx.api.sendMessage(
      Number(updatedSuggestion.submittedById),
      `🎉 **پیشنهاد شما تایید شد!**\n\nدرس **${updatedSuggestion.title}** توسط ناظران تایید شد و به سیستم اضافه گردید.`
    );

    await ctx.answerCallbackQuery({ text: 'تایید شد' });
  } catch (err: any) {
    await ctx.answerCallbackQuery({ text: err.message || 'خطا در تایید پیشنهاد', show_alert: true });
    return;
  }
});

suggestionCallbackComposer.callbackQuery(/^reject_suggestion:(.+)$/, async (ctx): Promise<void> => {
  if (!isSupervisorOrAdmin(ctx.userRole)) {
    await ctx.answerCallbackQuery({ text: '⛔ عدم دسترسی کافی', show_alert: true });
    return;
  }

  const suggestionId = ctx.match[1]!;
  ctx.session.step = 'REJECT_REASON_WAIT';
  ctx.session.pendingRejection = { suggestionId };

  await ctx.reply('📝 لطفاً دلیل رد این پیشنهاد را وارد کنید تا برای کاربر ارسال شود:');
  await ctx.answerCallbackQuery();
  return;
});

// Listener for rejection reason entry
suggestionCallbackComposer.on('message:text', async (ctx, next): Promise<void> => {
  if (ctx.session.step === 'REJECT_REASON_WAIT' && ctx.session.pendingRejection) {
    const reason = ctx.message.text.trim();
    const suggestionId = ctx.session.pendingRejection.suggestionId;

    const rejected = await SuggestionService.rejectSuggestion(suggestionId, ctx.dbUser.id, reason);

    // Notify Submitter with Reason
    await ctx.api.sendMessage(
      Number(rejected.submittedById),
      `❌ **پیشنهاد شما رد شد.**\n\n📚 درس: ${rejected.title}\n💬 **دلیل رد:** ${reason}`
    );

    ctx.session.step = 'IDLE';
    ctx.session.pendingRejection = undefined;

    await ctx.reply('✅ علت رد پیشنهاد ثبت گردید و برای کاربر ارسال شد.');
    return;
  }

  await next();
  return;
});
