import { Composer, InlineKeyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { env } from '../../config/env.js';
import { SuggestionService } from '../../services/suggestion.service.js';
import { CourseService } from '../../services/course.service.js';
import { isValidUrl } from '../../utils/text-normalizer.js';
export const suggestComposer=new Composer<CustomContext>();
suggestComposer.hears('📥 پیشنهاد درس جدید',async ctx=>{ctx.session.step='SUGGEST_TITLE';ctx.session.pendingSuggestion={};await ctx.reply('📚 عنوان درس را وارد کنید:');});
suggestComposer.on('message:text',async(ctx,next):Promise<void>=>{const t=ctx.message.text.trim();
 if(ctx.session.step==='SUGGEST_TITLE'){const r=await CourseService.resolveCourse(t);ctx.session.pendingSuggestion={title:t};ctx.session.pendingCourseCandidates=r.candidates.map(c=>c.id);if(r.kind==='EXACT'){ctx.session.pendingSuggestion.courseId=r.course!.id;ctx.session.step='SUGGEST_INSTRUCTOR';await ctx.reply(`✅ این پیشنهاد به «${r.course!.title}» مربوط است.\n\n👨‍🏫 نام استاد را وارد کنید:`);return;}if(r.kind==='AMBIGUOUS'){ctx.session.step='SUGGEST_COURSE_SELECT';const kb=new InlineKeyboard();r.candidates.forEach(c=>kb.text(`📚 ${c.title}`,`suggest:select:${c.id}`).row());kb.text('➕ هیچ‌کدام؛ درس جدید','suggest:new');await ctx.reply('🔎 چند درس مشابه پیدا شد؛ انتخاب کنید:',{reply_markup:kb});return;}ctx.session.step='SUGGEST_INSTRUCTOR';await ctx.reply('ℹ️ درس مشابهی پیدا نشد؛ پیشنهاد ایجاد درس جدید ثبت می‌شود.\n\n👨‍🏫 نام استاد را وارد کنید:');return;}
 if(ctx.session.step==='SUGGEST_INSTRUCTOR'){ctx.session.pendingSuggestion={...ctx.session.pendingSuggestion,instructor:t};ctx.session.step='SUGGEST_SEMESTER';await ctx.reply('📅 نیم‌سال را وارد کنید:');return;}
 if(ctx.session.step==='SUGGEST_SEMESTER'){ctx.session.pendingSuggestion={...ctx.session.pendingSuggestion,semester:t};ctx.session.step='SUGGEST_LINK';await ctx.reply('🔗 لینک منبع را وارد کنید:');return;}
 if(ctx.session.step==='SUGGEST_LINK'){if(!isValidUrl(t)){await ctx.reply('❌ لینک معتبر نیست.');return;}const p=ctx.session.pendingSuggestion!;const s=await SuggestionService.createSuggestion({title:p.title!,instructor:p.instructor!,semester:p.semester!,link:t,submittedById:ctx.dbUser.id,courseId:p.courseId});const kb=new InlineKeyboard().text('✅ تایید و افزودن',`approve_suggestion:${s.id}`).text('❌ رد',`reject_suggestion:${s.id}`);await ctx.api.sendMessage(Number(env.SUPERVISORS_GROUP_ID),`📥 پیشنهاد جدید\n\n📚 ${s.title}\n👨‍🏫 ${s.instructor}\n📅 ${s.semester}\n🔗 ${s.link}`,{reply_markup:kb});ctx.session.step='IDLE';ctx.session.pendingSuggestion=undefined;await ctx.reply('✅ پیشنهاد برای بررسی ارسال شد.');return;}
 await next();});
