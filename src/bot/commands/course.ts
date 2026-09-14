import { Composer, InlineKeyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { CourseService } from '../../services/course.service.js';
import { isValidUrl } from '../../utils/text-normalizer.js';

const validText=(v:string)=>v.length>0&&v.length<=200;

export const courseComposer = new Composer<CustomContext>();

courseComposer.hears('📚 مشاهده دروس اخیر', async (ctx): Promise<void> => {
  const courses = await CourseService.getLatestCourses(5);
  if (courses.length === 0) {
    await ctx.reply('هنوز هیچ درسی در سیستم ثبت نشده است.');
    return;
  }

  let text = '📚 آخرین دروس ثبت‌شده در سامانه:\n\n';
  courses.forEach((c, idx) => {
    text += `${idx + 1}. **${c.title}**\n👨‍🏫 استاد: ${c.instructor}\n📅 نیم‌سال: ${c.semester}\n🔗 [ورود به لینک درس](${c.link})\n\n`;
  });

  await ctx.reply(text, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
});

courseComposer.hears('🔍 جستجوی درس', async (ctx): Promise<void> => {
  ctx.session.step = 'SEARCH_COURSE';
  await ctx.reply('لطفاً نام درس، نام استاد یا نیم‌سال تحصیلی را جهت جستجو وارد کنید:');
});

// Search execution & admin add-course flow dynamic input listener
courseComposer.on('message:text', async (ctx, next): Promise<void> => {
  const text = ctx.message.text.trim();
  if (!validText(text)) {
    await ctx.reply('❌ متن باید بین ۱ تا ۲۰۰ کاراکتر باشد.');
    return;
  }

  if (ctx.session.step === 'SEARCH_COURSE') {
    const courses = await CourseService.searchCourses(text);
    ctx.session.step = 'IDLE';
    if (!courses.length) { await ctx.reply('نتیجه‌ای پیدا نشد.'); return; }
    const result = courses.map((c,i)=>`${i+1}. ${c.title}\n👨‍🏫 ${c.instructor} | 📅 ${c.semester}\n🔗 ${c.link}`).join('\n\n');
    await ctx.reply(`🔍 نتایج جستجو:\n\n${result}`, { link_preview_options: { is_disabled: true } });
    return;
  }

  // Conversational workflow handling for Admin adding a course
  if (ctx.session.step === 'ADD_COURSE_TITLE') {
    ctx.session.pendingCourse = { title: text };
    ctx.session.step = 'ADD_COURSE_INSTRUCTOR';
    await ctx.reply('لطفاً نام استاد درس را وارد کنید:');
    return;
  }

  if (ctx.session.step === 'ADD_COURSE_INSTRUCTOR') {
    ctx.session.pendingCourse = { ...ctx.session.pendingCourse, instructor: text };
    ctx.session.step = 'ADD_COURSE_SEMESTER';
    await ctx.reply('لطفاً نیم‌سال تحصیلی را وارد کنید (مثال: 4031):');
    return;
  }

  if (ctx.session.step === 'ADD_COURSE_SEMESTER') {
    ctx.session.pendingCourse = { ...ctx.session.pendingCourse, semester: text };
    ctx.session.step = 'ADD_COURSE_LINK';
    await ctx.reply('لطفاً لینک مرجع درس (تلگرام، وب‌سایت و...) را وارد کنید:');
    return;
  }

  if (ctx.session.step === 'ADD_COURSE_LINK') {
    if (!isValidUrl(text)) {
      await ctx.reply('❌ لینک وارد شده معتبر نیست. لطفاً یک URL معتبر که با http یا https شروع می‌شود وارد کنید:');
      return;
    }

    const courseData = {
      title: ctx.session.pendingCourse?.title!,
      instructor: ctx.session.pendingCourse?.instructor!,
      semester: ctx.session.pendingCourse?.semester!,
      link: text,
    };

    // Duplicate Detection Guard
    const duplicate = await CourseService.checkDuplicate(courseData);
    if (duplicate.isDuplicate && duplicate.matchedCourse) {
      ctx.session.pendingCourse = { ...courseData };
      ctx.session.step = 'ADD_COURSE_CONFIRM_DUPLICATE';

      const inlineKb = new InlineKeyboard()
        .text('✅ بله، مجدداً ثبت شود', 'confirm_force_add_course')
        .text('❌ انصراف', 'cancel_add_course');

      await ctx.reply(
        `⚠️ **هشدار تکراری بودن درس!**\n\nعلت: ${duplicate.reason}\n\n**درس مشابه موجود:**\n📚 عنوان: ${duplicate.matchedCourse.title}\n👨‍🏫 استاد: ${duplicate.matchedCourse.instructor}\n📅 نیم‌سال: ${duplicate.matchedCourse.semester}\n\nآیا از ثبت مجدد این درس اطمینان دارید؟`,
        { reply_markup: inlineKb, parse_mode: 'Markdown' }
      );
      return;
    }

    // Direct Safe Insertion
    await CourseService.createCourse({
      ...courseData,
      createdById: ctx.dbUser.id,
    });

    ctx.session.step = 'IDLE';
    ctx.session.pendingCourse = undefined;
    await ctx.reply('✅ درس جدید با موفقیت در سامانه ثبت گردید.');
    return;
  }

  await next();
  return;
});
