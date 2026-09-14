"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestionCallbackComposer = void 0;
const grammy_1 = require("grammy");
const suggestion_service_js_1 = require("../../services/suggestion.service.js");
const roles_js_1 = require("../../auth/roles.js");
exports.suggestionCallbackComposer = new grammy_1.Composer();
exports.suggestionCallbackComposer.callbackQuery(/^suggest:select:(.+)$/, async (ctx) => {
    if (ctx.session.step !== 'SUGGEST_COURSE_SELECT' || !ctx.session.pendingSuggestion) {
        await ctx.answerCallbackQuery({ text: 'جلسه منقضی شده.', show_alert: true });
        return;
    }
    const c = await (await import('../../services/course.service.js')).CourseService.getCourse(ctx.match[1]);
    if (!c) {
        await ctx.answerCallbackQuery({ text: 'درس پیدا نشد.', show_alert: true });
        return;
    }
    ctx.session.pendingSuggestion.courseId = c.id;
    ctx.session.step = 'SUGGEST_INSTRUCTOR';
    await ctx.editMessageText(`✅ درس انتخاب شد: ${c.title}\n\n👨‍🏫 نام استاد را وارد کنید:`);
    await ctx.answerCallbackQuery();
});
exports.suggestionCallbackComposer.callbackQuery('suggest:new', async (ctx) => { ctx.session.pendingSuggestion = { ...ctx.session.pendingSuggestion, courseId: undefined }; ctx.session.step = 'SUGGEST_INSTRUCTOR'; await ctx.editMessageText('➕ درس جدید انتخاب شد.\n\n👨‍🏫 نام استاد را وارد کنید:'); await ctx.answerCallbackQuery(); });
exports.suggestionCallbackComposer.callbackQuery(/^approve_suggestion:(.+)$/, async (ctx) => {
    if (!(0, roles_js_1.isSupervisorOrAdmin)(ctx.userRole)) {
        await ctx.answerCallbackQuery({ text: '⛔ عدم دسترسی کافی', show_alert: true });
        return;
    }
    const suggestionId = ctx.match[1];
    try {
        const { updatedSuggestion, duplicateMatch } = await suggestion_service_js_1.SuggestionService.approveSuggestion(suggestionId, ctx.dbUser.id);
        let resultMsg = `✅ **پیشنهاد با موفقیت تایید و به بانک اطلاعاتی اضافه شد.**`;
        if (duplicateMatch.isDuplicate) {
            resultMsg += `\n\n⚠️ **تذکر:** این درس طبق الگوریتم هوشمند، با یک درس موجود شباهت داشت.`;
        }
        await ctx.editMessageText(resultMsg, { parse_mode: 'Markdown' });
        // Notify original Submitter
        await ctx.api.sendMessage(Number(updatedSuggestion.submittedById), `🎉 **پیشنهاد شما تایید شد!**\n\nدرس **${updatedSuggestion.title}** توسط ناظران تایید شد و به سیستم اضافه گردید.`);
        await ctx.answerCallbackQuery({ text: 'تایید شد' });
    }
    catch (err) {
        await ctx.answerCallbackQuery({ text: err.message || 'خطا در تایید پیشنهاد', show_alert: true });
        return;
    }
});
exports.suggestionCallbackComposer.callbackQuery(/^reject_suggestion:(.+)$/, async (ctx) => {
    if (!(0, roles_js_1.isSupervisorOrAdmin)(ctx.userRole)) {
        await ctx.answerCallbackQuery({ text: '⛔ عدم دسترسی کافی', show_alert: true });
        return;
    }
    const suggestionId = ctx.match[1];
    ctx.session.step = 'REJECT_REASON_WAIT';
    ctx.session.pendingRejection = { suggestionId };
    await ctx.reply('📝 لطفاً دلیل رد این پیشنهاد را وارد کنید تا برای کاربر ارسال شود:');
    await ctx.answerCallbackQuery();
    return;
});
// Listener for rejection reason entry
exports.suggestionCallbackComposer.on('message:text', async (ctx, next) => {
    if (ctx.session.step === 'REJECT_REASON_WAIT' && ctx.session.pendingRejection) {
        const reason = ctx.message.text.trim();
        const suggestionId = ctx.session.pendingRejection.suggestionId;
        const rejected = await suggestion_service_js_1.SuggestionService.rejectSuggestion(suggestionId, ctx.dbUser.id, reason);
        // Notify Submitter with Reason
        await ctx.api.sendMessage(Number(rejected.submittedById), `❌ **پیشنهاد شما رد شد.**\n\n📚 درس: ${rejected.title}\n💬 **دلیل رد:** ${reason}`);
        ctx.session.step = 'IDLE';
        ctx.session.pendingRejection = undefined;
        await ctx.reply('✅ علت رد پیشنهاد ثبت گردید و برای کاربر ارسال شد.');
        return;
    }
    await next();
    return;
});
