import { Composer } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { SuggestionService } from '../../services/suggestion.service.js';
import { isSupervisorOrAdmin } from '../../auth/roles.js';
import { LinkRequestService } from '../../services/link-request.service.js';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';

export const suggestionCallbackComposer = new Composer<CustomContext>();

suggestionCallbackComposer.callbackQuery(/^suggest:select:(.+)$/, async (ctx): Promise<void> => {
  if (ctx.session.step !== 'SUGGEST_COURSE_SELECT' || !ctx.session.pendingSuggestion) { await ctx.answerCallbackQuery({text:'جلسه منقضی شده.',show_alert:true}); return; }
  const c = await (await import('../../services/course.service.js')).CourseService.getCourse(ctx.match[1]!);
  if (!c) { await ctx.answerCallbackQuery({text:'درس پیدا نشد.',show_alert:true}); return; }
  ctx.session.pendingSuggestion.courseId=c.id; ctx.session.step='SUGGEST_INSTRUCTOR';
  await ctx.editMessageText(`✅ درس انتخاب شد: ${c.title}\n\n👨‍🏫 نام استاد را وارد کنید:`); await ctx.answerCallbackQuery();
});
suggestionCallbackComposer.callbackQuery('suggest:new', async (ctx): Promise<void> => { ctx.session.pendingSuggestion={...ctx.session.pendingSuggestion,courseId:undefined}; ctx.session.step='SUGGEST_INSTRUCTOR'; await ctx.editMessageText('➕ درس جدید انتخاب شد.\n\n👨‍🏫 نام استاد را وارد کنید:'); await ctx.answerCallbackQuery(); });

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

    await ctx.api.sendMessage(
      Number(updatedSuggestion.submittedById),
      `🎉 <b>لینک شما تایید شد!</b>\n\n📚 ${updatedSuggestion.title}\n👨‍🏫 ${updatedSuggestion.instructor || 'ندارد'}\n📅 ${updatedSuggestion.semester}\n\nلینک با موفقیت در سامانه ثبت شد.`,
      { parse_mode: 'HTML' }
    ).catch(() => {});

    const fulfilled = await LinkRequestService.fulfillForResource({
      courseId: updatedSuggestion.courseId!,
      instructor: updatedSuggestion.instructor,
      semester: updatedSuggestion.semester
    });

    if (fulfilled) {
      for (const requester of fulfilled.requesters) {
        await ctx.api.sendMessage(
          Number(requester.userId),
          `🎉 <b>لینک کلاس موردنظر شما پیدا شد!</b>\n\n📚 ${fulfilled.course.title}\n👨‍🏫 ${fulfilled.instructor}\n📅 ${fulfilled.semester}\n\n🔗 ${updatedSuggestion.link}`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
        await prisma.linkRequestUser.updateMany({where:{requestId:fulfilled.id,userId:requester.userId},data:{notifiedAt:new Date()}});
      }
      if (env.LINK_REQUEST_CHANNEL_ID && fulfilled.channelMessageId) {
        await ctx.api.editMessageText(
          Number(env.LINK_REQUEST_CHANNEL_ID),
          fulfilled.channelMessageId,
          `✅ <b>لینک این کلاس پیدا شد</b>\n\n📚 ${fulfilled.course.title}\n👨‍🏫 ${fulfilled.instructor}\n📅 ${fulfilled.semester}\n\n🔗 لینک پس از بررسی Supervisor ثبت شد.`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    }

    await ctx.answerCallbackQuery({ text: fulfilled ? 'تایید شد و درخواست‌ها اطلاع‌رسانی شدند.' : 'تایید شد' });
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
