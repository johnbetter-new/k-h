import { Composer, InlineKeyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { CourseService } from '../../services/course.service.js';
import { isValidUrl } from '../../utils/text-normalizer.js';

export const courseComposer = new Composer<CustomContext>();

courseComposer.hears('📚 مشاهده دروس اخیر', async (ctx) => {
  const courses = await CourseService.getLatestCourses(5);
  if (courses.length === 0) {
    return ctx.reply('هنوز هیچ درسی در سیستم ثبت نشده است.');
  }

  let text = '📚 **آخرین دروس ثبت‌شده в سامانه:**\n\n';
  courses.forEach((c, idx) => {
    text += `${idx + 1}. **${c.title}**\n👨‍🏫 استاد: ${c.instructor}\n📅 نیم‌سال: ${c.semester}\n🔗 [ورود به لینک درس](${c.link})\n\n`;
  });

  await ctx.reply(text, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

courseComposer.hears('🔍 جستجوی درس', async (ctx) => {
  await ctx.reply('لطفاً نام درس، نام استاد یا نیم‌سال تحصیلی را جهت جستجو وارد کنید:');
});

// Search execution & admin add-course flow dynamic input listener
courseComposer.on('message:text', async (ctx, next) => {
  const text = ctx.message.text.trim();

  // Conversational workflow handling for Admin adding a course
  if (ctx.session.step === 'ADD_COURSE_TITLE') {
    ctx.session.pendingCourse = { title: text };
    ctx.session.step = 'ADD_COURSE_INSTRUCTOR';
    return ctx.reply('لطفاً نام استاد درس را وارد کنید:');
  }

  if (ctx.session.step === 'ADD_COURSE_INSTRUCTOR') {
    ctx.session.pendingCourse = { ...ctx.session.pendingCourse, instructor: text };
    ctx.session.step = 'ADD_COURSE_SEMESTER';
    return ctx.reply('لطفاً نیم‌سال تحصیلی را وارد کنید (مثال: 4031):');
  }

  if (ctx.session.step === 'ADD_COURSE_SEMESTER') {
    ctx.session.pendingCourse = { ...ctx.session.pendingCourse, semester: text };
    ctx.session.step = 'ADD_COURSE_LINK';
    return ctx.reply('لطفاً لینک مرجع درس (تلگرام، وب‌سایت و...) را وارد کنید:');
  }

  if (ctx.session.step === 'ADD_COURSE_LINK') {
    if (!isValidUrl(text)) {
      return ctx.reply('❌ لینک وارد شده معتبر نیست. لطفاً یک URL معتبر که با http یا https شروع می‌شود وارد کنید:');
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

      return ctx.reply(
        `⚠️ **هشدار تکراری بودن درس!**\n\nعلت: ${duplicate.reason}\n\n**درس مشابه موجود:**\n📚 عنوان: ${duplicate.matchedCourse.title}\n👨‍🏫 استاد: ${duplicate.matchedCourse.instructor}\n📅 نیم‌سال: ${duplicate.matchedCourse.semester}\n\nآیا از ثبت مجدد این درس اطمینان دارید؟`,
        { reply_markup: inlineKb, parse_mode: 'Markdown' }
      );
    }

    // Direct Safe Insertion
    await CourseService.createCourse({
      ...courseData,
      createdById: ctx.dbUser.id,
    });

    ctx.session.step = 'IDLE';
    ctx.session.pendingCourse = undefined;
    return ctx.reply('✅ درس جدید با موفقیت در سامانه ثبت گردید.');
  }

  return next();
});
