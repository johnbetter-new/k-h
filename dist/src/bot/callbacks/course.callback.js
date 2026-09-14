"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseCallbackComposer = void 0;
const grammy_1 = require("grammy");
const course_service_js_1 = require("../../services/course.service.js");
const suggestion_service_js_1 = require("../../services/suggestion.service.js");
const env_js_1 = require("../../config/env.js");
exports.courseCallbackComposer = new grammy_1.Composer();
async function showCourse(ctx, id) { const c = await course_service_js_1.CourseService.getCourse(id); if (!c) {
    await ctx.answerCallbackQuery({ text: 'درس پیدا نشد.', show_alert: true });
    return;
} const kb = new grammy_1.InlineKeyboard(); c.resources.slice(0, 15).forEach((r, i) => kb.url(`🔗 منبع ${i + 1}`, r.link).row()); await ctx.editMessageText(`📚 ${c.title}\n\n🔗 تعداد منابع: ${c.resources.length}\n\nیک منبع را انتخاب کنید:`, { reply_markup: kb }); await ctx.answerCallbackQuery(); }
exports.courseCallbackComposer.callbackQuery(/^course:view:(.+)$/, async (ctx) => { await showCourse(ctx, ctx.match[1]); });
exports.courseCallbackComposer.callbackQuery(/^course:select:(.+)$/, async (ctx) => { const id = ctx.match[1]; const p = ctx.session.step === 'SEARCH_COURSE_SELECT'; const c = await course_service_js_1.CourseService.getCourse(id); if (!c) {
    await ctx.answerCallbackQuery({ text: 'درس پیدا نشد.', show_alert: true });
    return;
} if (p) {
    ctx.session.step = 'IDLE';
    await showCourse(ctx, id);
    return;
} await ctx.answerCallbackQuery(); });
exports.courseCallbackComposer.callbackQuery(/^resource:select:(.+)$/, async (ctx) => { if (ctx.session.step !== 'ADD_RESOURCE_COURSE_SELECT' || !ctx.session.pendingResource) {
    await ctx.answerCallbackQuery({ text: 'جلسه منقضی شده.', show_alert: true });
    return;
} const c = await course_service_js_1.CourseService.getCourse(ctx.match[1]); if (!c) {
    await ctx.answerCallbackQuery({ text: 'درس پیدا نشد.', show_alert: true });
    return;
} ctx.session.pendingResource.courseId = c.id; ctx.session.pendingResource.courseQuery = c.title; ctx.session.step = 'ADD_RESOURCE_INSTRUCTOR'; await ctx.editMessageText(`✅ ${c.title}\n\n👨‍🏫 نام استاد را وارد کنید (در صورت نداشتن، «ندارد» بنویسید):`); await ctx.answerCallbackQuery(); });
exports.courseCallbackComposer.callbackQuery('resource:no_course', async (ctx) => { ctx.session.step = 'ADD_RESOURCE_COURSE_SEARCH'; await ctx.editMessageText('نام دقیق‌تر درس را وارد کنید:'); await ctx.answerCallbackQuery(); });
exports.courseCallbackComposer.callbackQuery('resource:force', async (ctx) => {
    const p = ctx.session.pendingResource;
    if (ctx.session.step !== 'ADD_RESOURCE_CONFLICT_CONFIRM' || !p?.courseId || !p.link || !p.semester) {
        await ctx.answerCallbackQuery({ text: 'جلسه منقضی شده.', show_alert: true });
        return;
    }
    const s = await suggestion_service_js_1.SuggestionService.createSuggestion({ title: p.courseQuery || 'منبع جدید', instructor: p.instructor || '', semester: p.semester, link: p.link, submittedById: ctx.dbUser.id, courseId: p.courseId });
    const kb = new grammy_1.InlineKeyboard().text('✅ تایید و افزودن', `approve_suggestion:${s.id}`).text('❌ رد', `reject_suggestion:${s.id}`);
    await ctx.api.sendMessage(Number(env_js_1.env.SUPERVISORS_GROUP_ID), `📥 لینک جدید برای بررسی

📚 ${s.title}
👨‍🏫 ${s.instructor || 'ندارد'}
📅 ${s.semester}
🔗 ${s.link}

⚠️ این لینک هنگام ثبت، مشابهت با یک منبع موجود داشت و با درخواست کاربر برای بررسی ارسال شده است.`, { reply_markup: kb });
    ctx.session.step = 'IDLE';
    ctx.session.pendingResource = undefined;
    await ctx.editMessageText('✅ لینک برای بررسی و تأیید ناظر ارسال شد. پس از تأیید، لینک به منابع درس اضافه می‌شود.');
    await ctx.answerCallbackQuery();
});
exports.courseCallbackComposer.callbackQuery('resource:cancel', async (ctx) => { ctx.session.step = 'IDLE'; ctx.session.pendingResource = undefined; await ctx.editMessageText('❌ ثبت لینک لغو شد.'); await ctx.answerCallbackQuery(); });
exports.courseCallbackComposer.callbackQuery('confirm_force_add_course', async (ctx) => { await ctx.answerCallbackQuery({ text: 'این قابلیت قدیمی است؛ از ثبت لینک جدید استفاده کنید.', show_alert: true }); });
exports.courseCallbackComposer.callbackQuery('cancel_add_course', async (ctx) => { ctx.session.step = 'IDLE'; ctx.session.pendingCourse = undefined; await ctx.editMessageText('❌ عملیات لغو شد.'); await ctx.answerCallbackQuery(); });
