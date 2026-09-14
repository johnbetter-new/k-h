import { Composer, InlineKeyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { CourseService } from '../../services/course.service.js';
import { isValidUrl } from '../../utils/text-normalizer.js';
const validText=(v:string)=>v.length>0&&v.length<=200;
export const courseComposer = new Composer<CustomContext>();

courseComposer.hears('📚 مشاهده دروس اخیر', async (ctx): Promise<void> => {
  const courses=await CourseService.getLatestCourses(10); if(!courses.length){await ctx.reply('هنوز هیچ درسی ثبت نشده است.');return;}
  const kb=new InlineKeyboard(); courses.forEach(c=>kb.text(`📚 ${c.title.slice(0,35)}`,`course:view:${c.id}`).row());
  await ctx.reply('📚 دروس موجود در سامانه:\n\nبرای مشاهده منابع، درس را انتخاب کنید:',{reply_markup:kb});
});
courseComposer.hears('🔍 جستجوی درس', async ctx=>{ctx.session.step='SEARCH_COURSE';await ctx.reply('🔎 نام درس را وارد کنید:');});
courseComposer.hears('➕ ثبت لینک جدید', async ctx=>{ctx.session.step='ADD_RESOURCE_LINK';ctx.session.pendingResource={};await ctx.reply('🔗 لینک منبع درس را ارسال کنید:');});

courseComposer.on('message:text',async(ctx,next):Promise<void>=>{
 const text=ctx.message.text.trim(); if(!validText(text)){await ctx.reply('❌ متن باید بین ۱ تا ۲۰۰ کاراکتر باشد.');return;}
 if(ctx.session.step==='SEARCH_COURSE'){
   const r=await CourseService.resolveCourse(text); ctx.session.pendingCourseCandidates=r.candidates.map(c=>c.id); ctx.session.step=r.kind==='EXACT'?'IDLE':'SEARCH_COURSE_SELECT';
   if(r.kind==='NONE'){await ctx.reply('❌ درسی با این نام پیدا نشد.');return;}
   const kb=new InlineKeyboard(); r.candidates.forEach(c=>kb.text(`📚 ${c.title}`,`course:select:${c.id}`).row());
   await ctx.reply(r.kind==='EXACT'?`✅ درس پیدا شد: ${r.candidates[0].title}`:'🔎 چند تطابق احتمالی پیدا شد. لطفاً درس موردنظر را انتخاب کنید:',{reply_markup:kb}); return;
 }
 if(ctx.session.step==='ADD_RESOURCE_LINK'){
   if(!isValidUrl(text)){await ctx.reply('❌ لینک معتبر نیست.');return;}
   ctx.session.pendingResource={link:text};ctx.session.step='ADD_RESOURCE_COURSE_SEARCH';await ctx.reply('📚 نام درس را وارد کنید:');return;
 }
 if(ctx.session.step==='ADD_RESOURCE_COURSE_SEARCH'){
   const r=await CourseService.resolveCourse(text);ctx.session.pendingCourseCandidates=r.candidates.map(c=>c.id);
   if(r.kind==='NONE'){await ctx.reply('❌ چنین درسی در فهرست رسمی پیدا نشد. لطفاً نام دیگری وارد کنید یا از بخش «پیشنهاد درس جدید» استفاده کنید.');return;}
   if(r.kind==='EXACT'){ctx.session.pendingResource={...ctx.session.pendingResource,courseId:r.course!.id,courseQuery:text};ctx.session.step='ADD_RESOURCE_INSTRUCTOR';await ctx.reply(`✅ درس انتخاب شد: ${r.course!.title}\n\n👨‍🏫 نام استاد را وارد کنید (در صورت نداشتن، «ندارد» بنویسید):`);return;}
   ctx.session.step='ADD_RESOURCE_COURSE_SELECT';const kb=new InlineKeyboard();r.candidates.forEach(c=>kb.text(`📚 ${c.title}`,`resource:select:${c.id}`).row());kb.text('❌ هیچ‌کدام','resource:no_course');await ctx.reply('🔎 چند درس مشابه پیدا شد؛ لطفاً یکی را انتخاب کنید:',{reply_markup:kb});return;
 }
 if(ctx.session.step==='ADD_RESOURCE_INSTRUCTOR'){ctx.session.pendingResource={...ctx.session.pendingResource,instructor:text==='ندارد'?'':text};ctx.session.step='ADD_RESOURCE_SEMESTER';await ctx.reply('📅 نیم‌سال را وارد کنید (مثال: 1405-1):');return;}
 if(ctx.session.step==='ADD_RESOURCE_SEMESTER'){
   const p=ctx.session.pendingResource!; const conflict=await CourseService.findResourceConflict({courseId:p.courseId!,link:p.link!,instructor:p.instructor,semester:text});
   ctx.session.pendingResource={...p,semester:text};
   if(conflict){ctx.session.step='ADD_RESOURCE_CONFLICT_CONFIRM';await ctx.reply('⚠️ منبعی بسیار مشابه قبلاً برای همین درس ثبت شده است. آیا می‌خواهید لینک را با وجود این مورد ثبت کنید؟',{reply_markup:new InlineKeyboard().text('✅ بله، ثبت شود','resource:force').text('❌ لغو','resource:cancel')});return;}
   if(!p.courseId || !p.link){await ctx.reply('❌ اطلاعات ثبت لینک ناقص است. لطفاً دوباره از ابتدا تلاش کنید.');ctx.session.step='IDLE';ctx.session.pendingResource=undefined;return;}
   await CourseService.createResource({courseId:p.courseId,link:p.link,instructor:p.instructor,semester:text,submittedById:ctx.dbUser.id});ctx.session.step='IDLE';ctx.session.pendingResource=undefined;await ctx.reply('✅ لینک با موفقیت ثبت شد.');return;
 }
 await next();
});
