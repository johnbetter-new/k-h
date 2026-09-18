import { Composer, InlineKeyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { CourseService } from '../../services/course.service.js';
import { SuggestionService } from '../../services/suggestion.service.js';
import { env } from '../../config/env.js';

export const courseCallbackComposer=new Composer<CustomContext>();

function submitterLabel(ctx: CustomContext): string {
  if (ctx.dbUser.username?.trim()) return `@${ctx.dbUser.username.trim()}`;
  return [ctx.dbUser.firstName, ctx.dbUser.lastName].filter(Boolean).join(' ').trim() || 'کاربر بدون نام';
}

async function showCourse(ctx:CustomContext,id:string){
  const c=await CourseService.getCourse(id);
  if(!c){await ctx.answerCallbackQuery({text:'درس پیدا نشد.',show_alert:true});return;}
  const kb=new InlineKeyboard();
  c.resources.slice(0,15).forEach((r,i)=>kb.url(`🔗 منبع ${i+1}`,r.link).row());
  await ctx.editMessageText(`📚 ${c.title}\n\n🔗 تعداد منابع: ${c.resources.length}\n\nیک منبع را انتخاب کنید:`,{reply_markup:kb});
  await ctx.answerCallbackQuery();
}

async function showSearchInstructors(ctx:CustomContext, courseId:string){
  const c=await CourseService.getCourse(courseId);
  if(!c){await ctx.answerCallbackQuery({text:'درس پیدا نشد.',show_alert:true});return;}
  const instructors=await CourseService.getInstructorsForSearch(courseId);
  ctx.session.pendingSearchCourseId=courseId;
  ctx.session.pendingSearchInstructors=instructors;
  if(!instructors.length){
    await ctx.answerCallbackQuery({text:'برای این درس کلاسی ثبت نشده است.',show_alert:true});
    await ctx.editMessageText(`📚 ${c.title}\n\n❌ هنوز کلاسی برای این درس ثبت نشده است.`);
    ctx.session.step='IDLE';
    return;
  }
  const kb=new InlineKeyboard();
  instructors.forEach((inst,i)=>kb.text(`👨‍🏫 ${inst.name}`.slice(0,60),`search:instructor:${i}`).row());
  ctx.session.step='SEARCH_INSTRUCTOR_SELECT';
  await ctx.editMessageText(`📚 ${c.title}\n\n👨‍🏫 استاد موردنظر را انتخاب کنید:`,{reply_markup:kb});
  await ctx.answerCallbackQuery();
}

courseCallbackComposer.callbackQuery(/^course:view:(.+)$/,async ctx=>{await showCourse(ctx,ctx.match[1]!);});

courseCallbackComposer.callbackQuery(/^course:select:(.+)$/,async ctx=>{
  const id=ctx.match[1]!;
  if(ctx.session.step!=='SEARCH_COURSE_SELECT'){await ctx.answerCallbackQuery({text:'این انتخاب دیگر معتبر نیست.',show_alert:true});return;}
  const allowed=ctx.session.pendingCourseCandidates||[];
  if(!allowed.includes(id)){await ctx.answerCallbackQuery({text:'این درس در جستجوی فعلی نیست.',show_alert:true});return;}
  await showSearchInstructors(ctx,id);
});

courseCallbackComposer.callbackQuery(/^search:instructor:(\d+)$/,async ctx=>{
  if(ctx.session.step!=='SEARCH_INSTRUCTOR_SELECT'){await ctx.answerCallbackQuery({text:'جلسه جستجو منقضی شده است.',show_alert:true});return;}
  const index=Number(ctx.match[1]);
  const courseId=ctx.session.pendingSearchCourseId;
  const instructors=ctx.session.pendingSearchInstructors||[];
  const instructor=instructors[index];
  if(!courseId||!instructor){await ctx.answerCallbackQuery({text:'این انتخاب دیگر معتبر نیست.',show_alert:true});return;}
  const course=await CourseService.getCourse(courseId);
  if(!course){await ctx.answerCallbackQuery({text:'درس پیدا نشد.',show_alert:true});return;}
  const semesters=await CourseService.getSemestersForSearch(courseId,instructor.normalized);
  ctx.session.pendingSearchInstructor=instructor;
  ctx.session.pendingSearchSemesters=semesters;
  if(!semesters.length){
    ctx.session.step='IDLE';
    await ctx.editMessageText(`📚 ${course.title}\n👨‍🏫 ${instructor.name}\n\n❌ برای این استاد هنوز کلاسی در هیچ نیم‌سالی ثبت نشده است.`);
    await ctx.answerCallbackQuery();
    return;
  }
  const kb=new InlineKeyboard();
  semesters.forEach((s,i)=>kb.text(`📅 ${s.semester}`,`search:semester:${i}`).row());
  kb.text('🔙 انتخاب استاد دیگر','search:back_instructors');
  ctx.session.step='SEARCH_SEMESTER_SELECT';
  await ctx.editMessageText(`📚 ${course.title}\n👨‍🏫 ${instructor.name}\n\n📅 نیم‌سال موردنظر را انتخاب کنید:`,{reply_markup:kb});
  await ctx.answerCallbackQuery();
});

courseCallbackComposer.callbackQuery('search:back_instructors',async ctx=>{
  const courseId=ctx.session.pendingSearchCourseId;
  if(!courseId){await ctx.answerCallbackQuery({text:'جلسه جستجو منقضی شده است.',show_alert:true});return;}
  await showSearchInstructors(ctx,courseId);
});

courseCallbackComposer.callbackQuery(/^search:semester:(\d+)$/,async ctx=>{
  if(ctx.session.step!=='SEARCH_SEMESTER_SELECT'){await ctx.answerCallbackQuery({text:'جلسه جستجو منقضی شده است.',show_alert:true});return;}
  const index=Number(ctx.match[1]);
  const courseId=ctx.session.pendingSearchCourseId;
  const instructor=ctx.session.pendingSearchInstructor;
  const semesters=ctx.session.pendingSearchSemesters||[];
  const semester=semesters[index];
  if(!courseId||!instructor||!semester){await ctx.answerCallbackQuery({text:'این انتخاب دیگر معتبر نیست.',show_alert:true});return;}
  const course=await CourseService.getCourse(courseId);
  if(!course){await ctx.answerCallbackQuery({text:'درس پیدا نشد.',show_alert:true});return;}
  const resources=await CourseService.getResourcesForSearch(courseId,instructor.normalized,semester.normalizedSemester);
  ctx.session.step='IDLE';
  ctx.session.pendingSearchCourseId=undefined;
  ctx.session.pendingSearchInstructors=undefined;
  ctx.session.pendingSearchInstructor=undefined;
  ctx.session.pendingSearchSemesters=undefined;
  if(!resources.length){
    await ctx.editMessageText(`📚 ${course.title}\n👨‍🏫 ${instructor.name}\n📅 ${semester.semester}\n\n❌ برای این کلاس لینکی ثبت نشده است.`);
    await ctx.answerCallbackQuery();
    return;
  }
  const kb=new InlineKeyboard();
  resources.slice(0,15).forEach((r,i)=>kb.url(`🔗 لینک ${i+1}`,r.link).row());
  const extra=resources.length>15?'\n\n⚠️ فقط ۱۵ لینک اول نمایش داده شده است.':'';
  await ctx.editMessageText(`📚 <b>${course.title}</b>\n👨‍🏫 <b>${instructor.name}</b>\n📅 <b>${semester.semester}</b>\n\n🔗 تعداد لینک‌های این کلاس: ${resources.length}\n\nلینک موردنظر را انتخاب کنید:${extra}`,{parse_mode:'HTML',reply_markup:kb});
  await ctx.answerCallbackQuery();
});

courseCallbackComposer.callbackQuery(/^resource:select:(.+)$/,async ctx=>{if(ctx.session.step!=='ADD_RESOURCE_COURSE_SELECT'||!ctx.session.pendingResource){await ctx.answerCallbackQuery({text:'جلسه منقضی شده.',show_alert:true});return;}const c=await CourseService.getCourse(ctx.match[1]!);if(!c){await ctx.answerCallbackQuery({text:'درس پیدا نشد.',show_alert:true});return;}ctx.session.pendingResource.courseId=c.id;ctx.session.pendingResource.courseQuery=c.title;ctx.session.step='ADD_RESOURCE_INSTRUCTOR';await ctx.editMessageText(`✅ ${c.title}\n\n👨‍🏫 نام استاد را وارد کنید (در صورت نداشتن، «ندارد» بنویسید):`);await ctx.answerCallbackQuery();});
courseCallbackComposer.callbackQuery('resource:no_course',async ctx=>{ctx.session.step='ADD_RESOURCE_COURSE_SEARCH';await ctx.editMessageText('نام دقیق‌تر درس را وارد کنید:');await ctx.answerCallbackQuery();});
courseCallbackComposer.callbackQuery('resource:force',async ctx=>{const p=ctx.session.pendingResource;if(ctx.session.step!=='ADD_RESOURCE_CONFLICT_CONFIRM'||!p?.courseId||!p.link||!p.semester){await ctx.answerCallbackQuery({text:'جلسه منقضی شده.',show_alert:true});return;}const s=await SuggestionService.createSuggestion({title:p.courseQuery || 'منبع جدید',instructor:p.instructor || '',semester:p.semester,link:p.link,submittedById:ctx.dbUser.id,courseId:p.courseId});const kb=new InlineKeyboard().text('✅ تایید و افزودن',`approve_suggestion:${s.id}`).text('❌ رد',`reject_suggestion:${s.id}`);await ctx.api.sendMessage(Number(env.SUPERVISORS_GROUP_ID),`📥 لینک جدید برای بررسی\n\n👤 ثبت‌کننده: ${submitterLabel(ctx)}\n🆔 Telegram ID: ${ctx.dbUser.id.toString()}\n📚 ${s.title}\n👨‍🏫 ${s.instructor || 'ندارد'}\n📅 ${s.semester}\n🔗 ${s.link}\n\n⚠️ این لینک هنگام ثبت، مشابهت با یک منبع موجود داشت و با درخواست کاربر برای بررسی ارسال شده است.`,{reply_markup:kb});ctx.session.step='IDLE';ctx.session.pendingResource=undefined;await ctx.editMessageText('✅ لینک برای بررسی و تأیید ناظر ارسال شد. پس از تأیید، لینک به منابع درس اضافه می‌شود.');await ctx.answerCallbackQuery();});
courseCallbackComposer.callbackQuery('resource:cancel',async ctx=>{ctx.session.step='IDLE';ctx.session.pendingResource=undefined;await ctx.editMessageText('❌ ثبت لینک لغو شد.');await ctx.answerCallbackQuery();});
courseCallbackComposer.callbackQuery('confirm_force_add_course',async ctx=>{await ctx.answerCallbackQuery({text:'این قابلیت قدیمی است؛ از ثبت لینک جدید استفاده کنید.',show_alert:true});});
courseCallbackComposer.callbackQuery('cancel_add_course',async ctx=>{ctx.session.step='IDLE';ctx.session.pendingCourse=undefined;await ctx.editMessageText('❌ عملیات لغو شد.');await ctx.answerCallbackQuery();});
