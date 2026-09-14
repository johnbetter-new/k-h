import { Composer, InlineKeyboard } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { env } from '../../config/env.js';
import { isAdmin } from '../../auth/roles.js';
import { prisma } from '../../database/prisma.js';
import { CourseService } from '../../services/course.service.js';

export const adminComposer = new Composer<CustomContext>();

const isAdminGroup = (ctx: CustomContext): boolean =>
  Boolean(ctx.chat && BigInt(ctx.chat.id) === env.ADMIN_ONLY_GROUP_ID);

export const adminMenuKeyboard = (): InlineKeyboard =>
  new InlineKeyboard()
    .text('📊 آمار سامانه', 'admin:stats')
    .text('📚 مدیریت دروس', 'admin:courses')
    .row()
    .text('📝 پیشنهادهای در انتظار', 'admin:suggestions')
    .text('👥 مدیریت کاربران', 'admin:users')
    .row()
    .text('➕ افزودن درس', 'admin:add_course')
    .text('❌ بستن پنل', 'admin:close');

const coursesMenuKeyboard = (): InlineKeyboard =>
  new InlineKeyboard()
    .text('📋 آخرین دروس', 'admin:courses:list')
    .text('🔎 جستجوی درس', 'admin:courses:search')
    .row()
    .text('➕ افزودن درس', 'admin:add_course')
    .text('🗑 حذف درس', 'admin:courses:delete')
    .row()
    .text('🔙 بازگشت', 'admin:home');

const usersMenuKeyboard = (): InlineKeyboard =>
  new InlineKeyboard()
    .text('👥 کاربران اخیر', 'admin:users:list')
    .text('🔎 جستجوی کاربر', 'admin:users:search')
    .row()
    .text('🔙 بازگشت', 'admin:home');

function ensureAdmin(ctx: CustomContext): boolean {
  return isAdmin(ctx.userRole) && isAdminGroup(ctx);
}

async function showHome(ctx: CustomContext): Promise<void> {
  await ctx.editMessageText(
    '⚙️ **پنل مدیریت KIAU Hoosh**\n\nاز منوی زیر بخش موردنظر را انتخاب کنید.',
    { parse_mode: 'Markdown', reply_markup: adminMenuKeyboard() }
  );
}


adminComposer.command('admin', async (ctx): Promise<void> => {
  if (!isAdmin(ctx.userRole)) { await ctx.reply('⛔ شما دسترسی لازم برای ورود به پنل مدیریت را ندارید.'); return; }
  if (!isAdminGroup(ctx)) { await ctx.reply('⛔ پنل مدیریت فقط در گروه مدیریت قابل استفاده است.'); return; }
  ctx.session.step = 'IDLE';
  ctx.session.pendingCourse = undefined;
  await ctx.reply('⚙️ **پنل مدیریت KIAU Hoosh**\n\nاز منوی زیر بخش موردنظر را انتخاب کنید:', { parse_mode: 'Markdown', reply_markup: adminMenuKeyboard() });
});

adminComposer.hears('⚙️ پنل مدیریت', async (ctx): Promise<void> => {
  if (!isAdmin(ctx.userRole)) {
    await ctx.reply('⛔ شما دسترسی لازم برای ورود به پنل مدیریت را ندارید.');
    return;
  }
  if (!isAdminGroup(ctx)) {
    await ctx.reply('⛔ پنل مدیریت فقط در گروه مدیریت قابل استفاده است.');
    return;
  }

  ctx.session.step = 'IDLE';
  ctx.session.pendingCourse = undefined;
  await ctx.reply('⚙️ **پنل مدیریت KIAU Hoosh**\n\nاز منوی زیر بخش موردنظر را انتخاب کنید:', {
    parse_mode: 'Markdown',
    reply_markup: adminMenuKeyboard(),
  });
});

adminComposer.callbackQuery(/^admin:/, async (ctx, next): Promise<void> => {
  if (!ensureAdmin(ctx)) {
    await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true });
    return;
  }

  const action = ctx.callbackQuery.data;

  if (action === 'admin:home') {
    ctx.session.step = 'IDLE';
    await showHome(ctx);
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:close') {
    ctx.session.step = 'IDLE';
    ctx.session.pendingCourse = undefined;
    await ctx.editMessageText('✅ پنل مدیریت بسته شد.');
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:stats') {
    const [users, courses, suggestions, pending, admins, supervisors] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.suggestion.count(),
      prisma.suggestion.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'SUPERVISOR' } }),
    ]);
    await ctx.editMessageText(
      `📊 **آمار سامانه**\n\n` +
        `👥 کاربران: ${users}\n` +
        `👑 ادمین‌ها: ${admins}\n` +
        `🛡 ناظران: ${supervisors}\n` +
        `📚 دروس: ${courses}\n` +
        `📝 کل پیشنهادها: ${suggestions}\n` +
        `⏳ پیشنهادهای در انتظار: ${pending}`,
      { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 بازگشت', 'admin:home') }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:courses') {
    await ctx.editMessageText('📚 **مدیریت دروس**\n\nعملیات موردنظر را انتخاب کنید:', {
      parse_mode: 'Markdown', reply_markup: coursesMenuKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:courses:list') {
    const courses = await CourseService.getLatestCourses(15);
    const text = courses.length
      ? '📋 **آخرین دروس**\n\n' + courses.map((c, i) => `${i + 1}. ${c.title}\n👨‍🏫 ${c.instructor} | 📅 ${c.semester}\n🆔 ${c.id}`).join('\n\n')
      : '📋 هنوز هیچ درسی ثبت نشده است.';
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: coursesMenuKeyboard() });
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:courses:search') {
    ctx.session.step = 'ADMIN_SEARCH_COURSE';
    await ctx.editMessageText('🔎 نام درس، استاد یا نیم‌سال را ارسال کنید:', {
      reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:courses'),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:courses:delete') {
    ctx.session.step = 'ADMIN_DELETE_COURSE';
    await ctx.editMessageText('🗑 برای حذف درس، **شناسه درس (ID)** را ارسال کنید.\n\nشناسه را می‌توانید از «آخرین دروس» بردارید.', {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:courses'),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:add_course') {
    ctx.session.step = 'ADD_COURSE_TITLE';
    ctx.session.pendingCourse = {};
    await ctx.editMessageText('➕ **افزودن درس جدید**\n\nلطفاً عنوان درس را وارد کنید:', {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:courses'),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:suggestions') {
    const pending = await prisma.suggestion.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    if (!pending.length) {
      await ctx.editMessageText('✅ هیچ پیشنهاد در انتظاری وجود ندارد.', {
        reply_markup: new InlineKeyboard().text('🔙 بازگشت', 'admin:home'),
      });
      await ctx.answerCallbackQuery();
      return;
    }
    const kb = new InlineKeyboard();
    pending.forEach((s) => kb.text(`📚 ${s.title.slice(0, 30)}`, `admin:suggestion:${s.id}`).row());
    kb.text('🔙 بازگشت', 'admin:home');
    await ctx.editMessageText(`📝 **پیشنهادهای در انتظار**\n\n${pending.length} مورد نمایش داده شد.`, {
      parse_mode: 'Markdown', reply_markup: kb,
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:users') {
    await ctx.editMessageText('👥 **مدیریت کاربران**\n\nبخش موردنظر را انتخاب کنید:', {
      parse_mode: 'Markdown', reply_markup: usersMenuKeyboard(),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:users:list') {
    const users = await prisma.user.findMany({ orderBy: { updatedAt: 'desc' }, take: 15 });
    const text = users.length
      ? '👥 **کاربران اخیر**\n\n' + users.map((u, i) => `${i + 1}. ${u.firstName}${u.lastName ? ` ${u.lastName}` : ''}\n🆔 ${u.id}\n🎭 ${u.role}${u.username ? `\n🔹 @${u.username}` : ''}`).join('\n\n')
      : 'هیچ کاربری ثبت نشده است.';
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: usersMenuKeyboard() });
    await ctx.answerCallbackQuery();
    return;
  }

  if (action === 'admin:users:search') {
    ctx.session.step = 'ADMIN_SEARCH_USER';
    await ctx.editMessageText('🔎 نام، username یا شناسه عددی کاربر را ارسال کنید:', {
      reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:users'),
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (action.startsWith('admin:suggestion:')) {
    const id = action.slice('admin:suggestion:'.length);
    const suggestion = await prisma.suggestion.findUnique({ where: { id } });
    if (!suggestion || suggestion.status !== 'PENDING') {
      await ctx.answerCallbackQuery({ text: 'این پیشنهاد دیگر در انتظار بررسی نیست.', show_alert: true });
      return;
    }
    const kb = new InlineKeyboard()
      .text('✅ تأیید', `approve_suggestion:${id}`)
      .text('❌ رد', `reject_suggestion:${id}`)
      .row()
      .text('🔙 لیست پیشنهادها', 'admin:suggestions');
    await ctx.editMessageText(
      `📝 **جزئیات پیشنهاد**\n\n📚 عنوان: ${suggestion.title}\n👨‍🏫 استاد: ${suggestion.instructor}\n📅 نیم‌سال: ${suggestion.semester}\n🔗 ${suggestion.link}\n${suggestion.description ? `\n📝 توضیحات: ${suggestion.description}` : ''}`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  await next();
});

adminComposer.on('message:text', async (ctx, next): Promise<void> => {
  if (!ensureAdmin(ctx)) {
    await next();
    return;
  }

  const text = ctx.message.text.trim();
  if (!text) return;

  if (ctx.session.step === 'ADMIN_SEARCH_COURSE') {
    const courses = await CourseService.searchCourses(text);
    ctx.session.step = 'IDLE';
    if (!courses.length) {
      await ctx.reply('🔎 نتیجه‌ای پیدا نشد.', { reply_markup: coursesMenuKeyboard() });
      return;
    }
    await ctx.reply(
      '🔎 **نتایج جستجو**\n\n' + courses.map((c, i) => `${i + 1}. ${c.title}\n👨‍🏫 ${c.instructor} | 📅 ${c.semester}\n🆔 ${c.id}`).join('\n\n'),
      { parse_mode: 'Markdown', reply_markup: coursesMenuKeyboard() }
    );
    return;
  }

  if (ctx.session.step === 'ADMIN_DELETE_COURSE') {
    const course = await prisma.course.findUnique({ where: { id: text } });
    if (!course) {
      await ctx.reply('❌ درس با این شناسه پیدا نشد. شناسه را دقیقاً ارسال کنید:');
      return;
    }
    ctx.session.step = 'ADMIN_CONFIRM_DELETE_COURSE';
    ctx.session.pendingCourse = { title: course.title, instructor: course.instructor, semester: course.semester, link: course.link };
    await ctx.reply(`⚠️ آیا از حذف این درس مطمئن هستید؟\n\n📚 ${course.title}\n👨‍🏫 ${course.instructor}\n📅 ${course.semester}`, {
      reply_markup: new InlineKeyboard().text('🗑 بله، حذف شود', `admin:delete_confirm:${course.id}`).text('❌ انصراف', 'admin:courses'),
    });
    return;
  }

  if (ctx.session.step === 'ADMIN_SEARCH_USER') {
    const numeric = /^\d+$/.test(text) ? BigInt(text) : undefined;
    const users = await prisma.user.findMany({
      where: numeric ? { id: numeric } : { OR: [{ username: { contains: text.replace(/^@/, ''), mode: 'insensitive' } }, { firstName: { contains: text, mode: 'insensitive' } }, { lastName: { contains: text, mode: 'insensitive' } }] },
      take: 10,
    });
    ctx.session.step = 'IDLE';
    if (!users.length) { await ctx.reply('🔎 کاربری پیدا نشد.', { reply_markup: usersMenuKeyboard() }); return; }
    const kb = new InlineKeyboard();
    users.forEach((u) => kb.text(`${u.firstName} — ${u.role}`, `admin:user:${u.id}`).row());
    kb.text('🔙 بازگشت', 'admin:users');
    await ctx.reply('👥 کاربران پیدا شده:', { reply_markup: kb });
    return;
  }

  if (ctx.session.step === 'ADMIN_CONFIRM_DELETE_COURSE') return;
  await next();
});

adminComposer.callbackQuery(/^admin:delete_confirm:(.+)$/, async (ctx): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const id = ctx.match[1]!;
  const deleted = await prisma.course.deleteMany({ where: { id } });
  ctx.session.step = 'IDLE';
  ctx.session.pendingCourse = undefined;
  await ctx.editMessageText(deleted.count ? '✅ درس با موفقیت حذف شد.' : '⚠️ درس قبلاً حذف شده است.', {
    reply_markup: new InlineKeyboard().text('📚 مدیریت دروس', 'admin:courses'),
  });
  await ctx.answerCallbackQuery();
});

adminComposer.callbackQuery(/^admin:user:(.+)$/, async (ctx): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const id = BigInt(ctx.match[1]!);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { await ctx.answerCallbackQuery({ text: 'کاربر پیدا نشد.', show_alert: true }); return; }
  const nextRole = user.role === 'USER' ? 'SUPERVISOR' : user.role === 'SUPERVISOR' ? 'ADMIN' : 'USER';
  const kb = new InlineKeyboard()
    .text(`🎭 تغییر نقش به ${nextRole}`, `admin:user_role:${id}`)
    .row().text('🔙 کاربران', 'admin:users');
  await ctx.editMessageText(`👤 **مدیریت کاربر**\n\nنام: ${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}\n🆔 ${user.id}\n🎭 نقش فعلی: ${user.role}${user.username ? `\n🔹 @${user.username}` : ''}\n\nبا دکمه زیر نقش را تغییر دهید.`, { parse_mode: 'Markdown', reply_markup: kb });
  await ctx.answerCallbackQuery();
});

adminComposer.callbackQuery(/^admin:user_role:(.+)$/, async (ctx): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const id = BigInt(ctx.match[1]!);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { await ctx.answerCallbackQuery({ text: 'کاربر پیدا نشد.', show_alert: true }); return; }
  if (id === ctx.dbUser.id) { await ctx.answerCallbackQuery({ text: 'برای جلوگیری از قفل شدن پنل، نقش خودتان را تغییر ندهید.', show_alert: true }); return; }
  const nextRole = user.role === 'USER' ? 'SUPERVISOR' : user.role === 'SUPERVISOR' ? 'ADMIN' : 'USER';
  await prisma.user.update({ where: { id }, data: { role: nextRole } });
  await ctx.editMessageText(`✅ نقش کاربر ${user.firstName} به **${nextRole}** تغییر کرد.`, { parse_mode: 'Markdown', reply_markup: usersMenuKeyboard() });
  await ctx.answerCallbackQuery({ text: 'نقش تغییر کرد' });
});
