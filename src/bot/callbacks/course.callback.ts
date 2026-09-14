import { Composer } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { CourseService } from '../../services/course.service.js';

export const courseCallbackComposer = new Composer<CustomContext>();

courseCallbackComposer.callbackQuery('confirm_force_add_course', async (ctx) => {
  if (ctx.session.step !== 'ADD_COURSE_CONFIRM_DUPLICATE' || !ctx.session.pendingCourse) {
    return ctx.answerCallbackQuery({ text: 'جلسه نامعتبر است.', show_alert: true });
  }

  const p = ctx.session.pendingCourse;
  await CourseService.createCourse({
    title: p.title!,
    instructor: p.instructor!,
    semester: p.semester!,
    link: p.link!,
    createdById: ctx.dbUser.id,
  });

  ctx.session.step = 'IDLE';
  ctx.session.pendingCourse = undefined;

  await ctx.editMessageText('✅ درس با موفقیت به صورت اجباری ذخیره گردید.');
  await ctx.answerCallbackQuery();
});

courseCallbackComposer.callbackQuery('cancel_add_course', async (ctx) => {
  ctx.session.step = 'IDLE';
  ctx.session.pendingCourse = undefined;

  await ctx.editMessageText('❌ عملیات افزودن درس لغو شد.');
  await ctx.answerCallbackQuery();
});
