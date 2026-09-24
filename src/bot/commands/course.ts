import { Composer, InlineKeyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { CourseService } from '../../services/course.service.js';
import { SuggestionService } from '../../services/suggestion.service.js';
import { env } from '../../config/env.js';
import { isValidUrl } from '../../utils/text-normalizer.js';

const validText=(v:string)=>v.length>0&&v.length<=200;

function submitterLabel(ctx: CustomContext): string {
  if (ctx.dbUser.username?.trim()) return `@${ctx.dbUser.username.trim()}`;
  return [ctx.dbUser.firstName, ctx.dbUser.lastName].filter(Boolean).join(' ').trim() || 'کاربر بدون نام';
}
export const courseComposer = new Composer<CustomContext>();

async function beginSearchForCourse(ctx: CustomContext, courseId: string) {
  const course = await CourseService.getCourse(courseId);
  if (!course) { await ctx.reply('❌ درس پیدا نشد.'); return; }

  const instructors = await CourseService.getInstructorsForSearch(courseId);
  ctx.session.pendingSearchCourseId = courseId;
  ctx.session.pendingSearchInstructors = instructors;

  if (!instructors.length) {
    ctx.session.pendingSearchInstructor = { name: 'استاد ثبت نشده', normalized: '__none__' };
    const semesters = await CourseService.getSemestersForSearch(courseId, '__none__');
    ctx.session.pendingSearchSemesters = semesters;
    if (!semesters.length) {
      ctx.session.step='IDLE';
      await ctx.reply(`📚 ${course.title}\n\n❌ برای این درس هنوز کلاسی ثبت نشده است.`);
      return;
    }
    ctx.session.step='SEARCH_SEMESTER_SELECT';
    const kb=new InlineKeyboard();
    semesters.forEach((s,i)=>kb.text(`📅 ${s.semester}`,`search:semester:${i}`).row());
    await ctx.reply(`📚 ${course.title}\n\n📅 نیم‌سال موردنظر را انتخاب کنید:`,{reply_markup:kb});
    return;
  }

  ctx.session.step='SEARCH_INSTRUCTOR_SELECT';
  const kb=new InlineKeyboard();
  instructors.forEach((inst,i)=>kb.text(`👨‍🏫 ${inst.name}`.slice(0,60),`search:instructor:${i}`).row());
  await ctx.reply(`📚 ${course.title}\n\n👨‍🏫 استاد موردنظر را انتخاب کنید:`,{reply_markup:kb});
}

courseComposer.hears('📚 مشاهده دروس اخیر', async ctx => {
  const courses=await CourseService.getLatestCourses(10); if(!courses.length){await ctx.reply('هنوز هیچ درسی ثبت نشده است.');return;}
  const kb=new InlineKeyboard(); courses.forEach(c=>kb.text(`📚 ${c.title.slice(0,35)}`,`course:view:${c.id}`).row());
  await ctx.reply('📚 دروس موجود در سامانه:\n\nبرای مشاهده منابع، درس را انتخاب کنید:',{reply_markup:kb});
});
courseComposer.hears('🔍 جستجوی درس', async ctx=>{ctx.session.step='SEARCH_COURSE';await ctx.reply('🔎 نام درس را وارد کنید:');});
courseComposer.hears('➕ ثبت لینک جدید', async ctx=>{ctx.session.step='ADD_RESOURCE_LINK';ctx.session.pendingResource={};await ctx.reply('🔗 لینک منبع درس را ارسال کنید:');});

courseComposer.on('message:text',async(ctx,next):Promise<void>=>{
 const text=ctx.message.text.trim(); if(!validText(text)){await ctx.reply('❌ متن باید بین ۱ تا ۲۰۰ کاراکتر باشد.');return;}
 if(ctx.session.step==='REQUEST_LINK_INPUT' && ctx.session.pendingLinkRequest){
   if(!isValidUrl(text)){await ctx.reply('❌ لینک معتبر نیست. لطفاً لینک گروه/کانال را ارسال کنید.');return;}
   const requestId=ctx.session.pendingLinkRequest.requestId;
   const {LinkRequestService}=await import('../../services/link-request.service.js');
   const request=await LinkRequestService.getById(requestId);
   if(!request || request.status!=='ACTIVE'){ctx.session.step='IDLE';ctx.session.pendingLinkRequest=undefined;await ctx.reply('ℹ️ این درخواست دیگر فعال نیست.');return;}
   const {SuggestionService}=await import('../../services/suggestion.service.js');
   const s=await SuggestionService.createSuggestion({title:request.course.title,instructor:request.instructor,semester:request.semester,link:text,submittedById:ctx.dbUser.id,courseId:request.courseId});
   const kb=new InlineKeyboard().text('✅ تایید و افزودن',`approve_suggestion:${s.id}`).text('❌ رد',`reject_suggestion:${s.id}`);
   await ctx.api.sendMessage(Number(env.SUPERVISORS_GROUP_ID),`📥 <b>لینک برای یک درخواست کلاس</b>\n\n👤 ارسال‌کننده: ${submitterLabel(ctx)}\n🆔 Telegram ID: ${ctx.dbUser.id.toString()}\n📚 ${request.course.title}\n👨‍🏫 ${request.instructor}\n📅 ${request.semester}\n👥 درخواست‌کنندگان: ${request.requesters.length}\n🔗 ${text}`,{parse_mode:'HTML',reply_markup:kb});
   ctx.session.step='IDLE';ctx.session.pendingLinkRequest=undefined;await ctx.reply('✅ لینک برای بررسی Supervisor ارسال شد. پس از تأیید، برای تمام درخواست‌کنندگان اطلاع‌رسانی می‌شود.');return;
 }
 if(ctx.session.step==='SEARCH_INSTRUCTOR_INPUT'){
   const courseId=ctx.session.pendingSearchCourseId; if(!courseId){ctx.session.step='IDLE';await ctx.reply('❌ جلسه جستجو منقضی شده است. دوباره جستجو را شروع کنید.');return;}
   const instructor={name:text,normalized:(await import('../../utils/text-normalizer.js')).normalizePersianText(text)};
   ctx.session.pendingSearchInstructor=instructor; const semesters=await CourseService.getSemestersForSearch(courseId,instructor.normalized); ctx.session.pendingSearchSemesters=semesters; ctx.session.step='SEARCH_SEMESTER_SELECT';
   const kb=new InlineKeyboard(); semesters.forEach((x,i)=>kb.text(`📅 ${x.semester}`,`search:semester:${i}`).row()); kb.text('✏️ نیم‌سال دیگر / درخواست لینک','search:semester_manual');
   const c=await CourseService.getCourse(courseId); await ctx.reply(`📚 ${c?.title||''}\n👨‍🏫 ${text}\n\n📅 نیم‌سال موردنظر را انتخاب کنید:`,{reply_markup:kb}); return;
 }
 if(ctx.session.step==='SEARCH_SEMESTER_INPUT'){
   const courseId=ctx.session.pendingSearchCourseId; const instructor=ctx.session.pendingSearchInstructor; if(!courseId||!instructor){ctx.session.step='IDLE';await ctx.reply('❌ جلسه جستجو منقضی شده است.');return;}
   const semester={semester:text,normalizedSemester:(await import('../../utils/text-normalizer.js')).normalizePersianText(text)};
   const resources=await CourseService.getResourcesForSearch(courseId,instructor.normalized,semester.normalizedSemester);
   const c=await CourseService.getCourse(courseId); ctx.session.step='IDLE'; ctx.session.pendingSearchCourseId=undefined;ctx.session.pendingSearchInstructors=undefined;ctx.session.pendingSearchInstructor=undefined;ctx.session.pendingSearchSemesters=undefined;
   if(!resources.length){ctx.session.pendingLinkRequestDraft={courseId,instructor,semester};await ctx.reply(`📚 ${c?.title||''}\n👨‍🏫 ${instructor.name}\n📅 ${semester.semester}\n\n❌ هنوز لینکی برای این کلاس ثبت نشده است.\n\nمی‌توانید درخواست کنید تا اگر دانشجوی دیگری لینک این کلاس را دارد، آن را ارسال کند.`,{reply_markup:new InlineKeyboard().text('🔔 درخواست لینک این کلاس','search:request_link')});return;}
   const kb=new InlineKeyboard();resources.slice(0,15).forEach((r,i)=>kb.url(`🔗 لینک ${i+1}`,r.link).row());await ctx.reply(`📚 ${c?.title||''}\n👨‍🏫 ${instructor.name}\n📅 ${semester.semester}\n\n🔗 لینک موردنظر را انتخاب کنید:`,{reply_markup:kb});return;
 }
 if(ctx.session.step==='SEARCH_COURSE'){
   const r=await CourseService.resolveCourse(text); ctx.session.pendingCourseCandidates=r.candidates.map(c=>c.id);
   if(r.kind==='NONE'){ctx.session.step='IDLE';await ctx.reply('❌ درسی با این نام پیدا نشد.');return;}
   if(r.kind==='EXACT'){
     ctx.session.step='IDLE';
     await beginSearchForCourse(ctx,r.course!.id);
     return;
   }
   ctx.session.step='SEARCH_COURSE_SELECT';
   const kb=new InlineKeyboard(); r.candidates.forEach(c=>kb.text(`📚 ${c.title}`,`course:select:${c.id}`).row());
   await ctx.reply('🔎 چند تطابق احتمالی پیدا شد. لطفاً درس موردنظر را انتخاب کنید:',{reply_markup:kb}); return;
 }
 if(ctx.session.step==='ADD_RESOURCE_LINK'){
   if(!isValidUrl(text)){await ctx.reply('❌ لینک معتبر نیست.');return;}
   ctx.session.pendingResource={link:text};ctx.session.step='ADD_RESOURCE_COURSE_SEARCH';await ctx.reply('📚 نام درس را وارد کنید:');return;
 }
 if(ctx.session.step==='ADD_RESOURCE_COURSE_SEARCH'){
   const r=await CourseService.resolveCourse(text);ctx.session.pendingCourseCandidates=r.candidates.map(c=>c.id);
   if(r.kind==='NONE'){await ctx.reply('❌ چنین درسی در فهرست رسمی پیدا نشد. لطفاً نام دیگری وارد کنید یا از بخش «پیشنهاد درس جدید» استفاده کنید.');return;}
   if(r.kind==='EXACT'){ctx.session.pendingResource={...ctx.session.pendingResource,courseId:r.course!.id,courseQuery:r.course!.title};ctx.session.step='ADD_RESOURCE_INSTRUCTOR';await ctx.reply(`✅ درس انتخاب شد: ${r.course!.title}\n\n👨‍🏫 نام استاد را وارد کنید (در صورت نداشتن، «ندارد» بنویسید):`);return;}
   ctx.session.step='ADD_RESOURCE_COURSE_SELECT';const kb=new InlineKeyboard();r.candidates.forEach(c=>kb.text(`📚 ${c.title}`,`resource:select:${c.id}`).row());kb.text('❌ هیچ‌کدام','resource:no_course');await ctx.reply('🔎 چند درس مشابه پیدا شد؛ لطفاً یکی را انتخاب کنید:',{reply_markup:kb});return;
 }
 if(ctx.session.step==='ADD_RESOURCE_INSTRUCTOR'){ctx.session.pendingResource={...ctx.session.pendingResource,instructor:text==='ندارد'?'':text};ctx.session.step='ADD_RESOURCE_SEMESTER';await ctx.reply('📅 نیم‌سال را وارد کنید (مثال: 1405-1):');return;}
 if(ctx.session.step==='ADD_RESOURCE_SEMESTER'){
   const p=ctx.session.pendingResource!; const conflict=await CourseService.findResourceConflict({courseId:p.courseId!,link:p.link!,instructor:p.instructor,semester:text});
   ctx.session.pendingResource={...p,semester:text};
   if(conflict){ctx.session.step='ADD_RESOURCE_CONFLICT_CONFIRM';await ctx.reply('⚠️ منبعی بسیار مشابه قبلاً برای همین درس ثبت شده است. آیا می‌خواهید لینک را با وجود این مورد ثبت کنید؟',{reply_markup:new InlineKeyboard().text('✅ بله، ثبت شود','resource:force').text('❌ لغو','resource:cancel')});return;}
   if(!p.courseId || !p.link){await ctx.reply('❌ اطلاعات ثبت لینک ناقص است. لطفاً دوباره از ابتدا تلاش کنید.');ctx.session.step='IDLE';ctx.session.pendingResource=undefined;return;}
   const s=await SuggestionService.createSuggestion({title:p.courseQuery || 'منبع جدید',instructor:p.instructor || '',semester:text,link:p.link,submittedById:ctx.dbUser.id,courseId:p.courseId});
   const kb=new InlineKeyboard().text('✅ تایید و افزودن',`approve_suggestion:${s.id}`).text('❌ رد',`reject_suggestion:${s.id}`);
   await ctx.api.sendMessage(Number(env.SUPERVISORS_GROUP_ID),`📥 لینک جدید برای بررسی\n\n👤 ثبت‌کننده: ${submitterLabel(ctx)}\n🆔 Telegram ID: ${ctx.dbUser.id.toString()}\n📚 ${s.title}\n👨‍🏫 ${s.instructor || 'ندارد'}\n📅 ${s.semester}\n🔗 ${s.link}`,{reply_markup:kb});
   ctx.session.step='IDLE';ctx.session.pendingResource=undefined;await ctx.reply('✅ لینک برای بررسی و تأیید ناظر ارسال شد. پس از تأیید، لینک به منابع درس اضافه می‌شود.');return;
 }
 await next();
});
