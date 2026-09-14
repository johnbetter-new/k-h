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
    .text('🛡 مدیریت ناظران', 'admin:supervisors')
    .text('🚫 محدودیت و بن', 'admin:moderation')
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
    .text('🛡 مدیریت ناظران', 'admin:supervisors')
    .text('🚫 محدودیت و بن', 'admin:moderation')
    .row()
    .text('🔙 بازگشت', 'admin:home');

const supervisorsMenuKeyboard = (): InlineKeyboard =>
  new InlineKeyboard()
    .text('🛡 لیست ناظران', 'admin:supervisors:list')
    .text('➕ افزودن ناظر', 'admin:supervisors:add')
    .row()
    .text('➖ حذف ناظر', 'admin:supervisors:remove')
    .row()
    .text('🔙 بازگشت', 'admin:home');

const moderationMenuKeyboard = (): InlineKeyboard =>
  new InlineKeyboard()
    .text('🔎 انتخاب کاربر', 'admin:moderation:search')
    .text('🚫 لیست کاربران بن‌شده', 'admin:moderation:banned')
    .row()
    .text('⛔ لیست کاربران محدود', 'admin:moderation:restricted')
    .text('🔓 رفع محدودیت', 'admin:moderation:unrestrict')
    .row()
    .text('🔙 بازگشت', 'admin:home');

function ensureAdmin(ctx: CustomContext): boolean {
  return isAdmin(ctx.userRole) && isAdminGroup(ctx);
}

async function showHome(ctx: CustomContext): Promise<void> {
  await ctx.editMessageText('⚙️ **پنل مدیریت KIAU Hoosh**\n\nاز منوی زیر بخش موردنظر را انتخاب کنید.', {
    parse_mode: 'Markdown',
    reply_markup: adminMenuKeyboard(),
  });
}

adminComposer.command('admin', async (ctx): Promise<void> => {
  if (!isAdmin(ctx.userRole)) { await ctx.reply('⛔ شما دسترسی لازم برای ورود به پنل مدیریت را ندارید.'); return; }
  if (!isAdminGroup(ctx)) { await ctx.reply('⛔ پنل مدیریت فقط در گروه مدیریت قابل استفاده است.'); return; }
  ctx.session.step = 'IDLE';
  ctx.session.pendingCourse = undefined;
  await ctx.reply('⚙️ **پنل مدیریت KIAU Hoosh**\n\nاز منوی زیر بخش موردنظر را انتخاب کنید:', {
    parse_mode: 'Markdown', reply_markup: adminMenuKeyboard(),
  });
});

adminComposer.hears('⚙️ پنل مدیریت', async (ctx): Promise<void> => {
  if (!isAdmin(ctx.userRole)) { await ctx.reply('⛔ شما دسترسی لازم برای ورود به پنل مدیریت را ندارید.'); return; }
  if (!isAdminGroup(ctx)) { await ctx.reply('⛔ پنل مدیریت فقط در گروه مدیریت قابل استفاده است.'); return; }
  ctx.session.step = 'IDLE';
  ctx.session.pendingCourse = undefined;
  await ctx.reply('⚙️ **پنل مدیریت KIAU Hoosh**\n\nاز منوی زیر بخش موردنظر را انتخاب کنید:', {
    parse_mode: 'Markdown', reply_markup: adminMenuKeyboard(),
  });
});

adminComposer.callbackQuery(/^admin:/, async (ctx, next): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const action = ctx.callbackQuery.data;

  if (action === 'admin:home') { ctx.session.step = 'IDLE'; await showHome(ctx); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:close') { ctx.session.step = 'IDLE'; ctx.session.pendingCourse = undefined; ctx.session.pendingModeration = undefined; await ctx.editMessageText('✅ پنل مدیریت بسته شد.'); await ctx.answerCallbackQuery(); return; }

  if (action === 'admin:stats') {
    const [users, courses, suggestions, pending, admins, supervisors, banned, restricted] = await Promise.all([
      prisma.user.count(), prisma.course.count(), prisma.suggestion.count(),
      prisma.suggestion.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }), prisma.user.count({ where: { role: 'SUPERVISOR' } }),
      prisma.user.count({ where: { isBanned: true } }), prisma.user.count({ where: { isRestricted: true } }),
    ]);
    await ctx.editMessageText(`📊 **آمار سامانه**\n\n👥 کاربران: ${users}\n👑 ادمین‌ها: ${admins}\n🛡 ناظران: ${supervisors}\n📚 دروس: ${courses}\n📝 کل پیشنهادها: ${suggestions}\n⏳ پیشنهادهای در انتظار: ${pending}\n🚫 بن‌شده: ${banned}\n⛔ محدودشده: ${restricted}`, { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 بازگشت', 'admin:home') });
    await ctx.answerCallbackQuery(); return;
  }

  if (action === 'admin:courses') { await ctx.editMessageText('📚 **مدیریت دروس**\n\nعملیات موردنظر را انتخاب کنید:', { parse_mode: 'Markdown', reply_markup: coursesMenuKeyboard() }); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:courses:list') {
    const courses = await CourseService.getLatestCourses(15);
    const text = courses.length ? '📋 **آخرین دروس**\n\n' + courses.map((c, i) => `${i + 1}. ${c.title}\n👨‍🏫 ${c.instructor} | 📅 ${c.semester}\n🆔 ${c.id}`).join('\n\n') : '📋 هنوز هیچ درسی ثبت نشده است.';
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: coursesMenuKeyboard() }); await ctx.answerCallbackQuery(); return;
  }
  if (action === 'admin:courses:search') { ctx.session.step = 'ADMIN_SEARCH_COURSE'; await ctx.editMessageText('🔎 نام درس، استاد یا نیم‌سال را ارسال کنید:', { reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:courses') }); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:courses:delete') { ctx.session.step = 'ADMIN_DELETE_COURSE'; await ctx.editMessageText('🗑 برای حذف درس، **شناسه درس (ID)** را ارسال کنید.', { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:courses') }); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:add_course') { ctx.session.step = 'ADD_COURSE_TITLE'; ctx.session.pendingCourse = {}; await ctx.editMessageText('➕ **افزودن درس جدید**\n\nلطفاً عنوان درس را وارد کنید:', { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:courses') }); await ctx.answerCallbackQuery(); return; }

  if (action === 'admin:suggestions') {
    const pending = await prisma.suggestion.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 10 });
    if (!pending.length) { await ctx.editMessageText('✅ هیچ پیشنهاد در انتظاری وجود ندارد.', { reply_markup: new InlineKeyboard().text('🔙 بازگشت', 'admin:home') }); await ctx.answerCallbackQuery(); return; }
    const kb = new InlineKeyboard(); pending.forEach(s => kb.text(`📚 ${s.title.slice(0, 30)}`, `admin:suggestion:${s.id}`).row()); kb.text('🔙 بازگشت', 'admin:home');
    await ctx.editMessageText(`📝 **پیشنهادهای در انتظار**\n\n${pending.length} مورد نمایش داده شد.`, { parse_mode: 'Markdown', reply_markup: kb }); await ctx.answerCallbackQuery(); return;
  }

  if (action === 'admin:users') { await ctx.editMessageText('👥 **مدیریت کاربران**\n\nبخش موردنظر را انتخاب کنید:', { parse_mode: 'Markdown', reply_markup: usersMenuKeyboard() }); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:users:list') {
    const users = await prisma.user.findMany({ orderBy: { updatedAt: 'desc' }, take: 15 });
    const text = users.length ? '👥 **کاربران اخیر**\n\n' + users.map((u, i) => `${i + 1}. ${u.firstName}${u.lastName ? ` ${u.lastName}` : ''}\n🆔 ${u.id}\n🎭 ${u.role}${u.username ? `\n🔹 @${u.username}` : ''}${u.isBanned ? '\n🚫 بن' : u.isRestricted ? '\n⛔ محدود' : ''}`).join('\n\n') : 'هیچ کاربری ثبت نشده است.';
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: usersMenuKeyboard() }); await ctx.answerCallbackQuery(); return;
  }
  if (action === 'admin:users:search') { ctx.session.step = 'ADMIN_SEARCH_USER'; await ctx.editMessageText('🔎 نام، username یا شناسه عددی کاربر را ارسال کنید:', { reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:users') }); await ctx.answerCallbackQuery(); return; }

  if (action === 'admin:supervisors') { await ctx.editMessageText('🛡 **مدیریت ناظران**\n\nاز این بخش می‌توانید ناظر اضافه یا حذف کنید.', { parse_mode: 'Markdown', reply_markup: supervisorsMenuKeyboard() }); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:supervisors:list') {
    const supervisors = await prisma.user.findMany({ where: { role: 'SUPERVISOR' }, orderBy: { updatedAt: 'desc' } });
    const text = supervisors.length ? '🛡 **ناظران فعلی**\n\n' + supervisors.map((u, i) => `${i + 1}. ${u.firstName}${u.lastName ? ` ${u.lastName}` : ''}\n🆔 ${u.id}${u.username ? `\n🔹 @${u.username}` : ''}`).join('\n\n') : '🛡 هیچ ناظری ثبت نشده است.';
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: supervisorsMenuKeyboard() }); await ctx.answerCallbackQuery(); return;
  }
  if (action === 'admin:supervisors:add') { ctx.session.step = 'ADMIN_ADD_SUPERVISOR'; await ctx.editMessageText('➕ **افزودن ناظر**\n\nشناسه عددی (Telegram ID) کاربر را ارسال کنید. اگر کاربر هنوز در ربات ثبت نشده باشد، حساب او با نقش ناظر ساخته می‌شود.', { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:supervisors') }); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:supervisors:remove') { ctx.session.step = 'ADMIN_SEARCH_USER'; await ctx.editMessageText('➖ برای حذف ناظر، شناسه عددی او را ارسال کنید. نقش او به USER برمی‌گردد.', { reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:supervisors') }); await ctx.answerCallbackQuery(); return; }

  if (action === 'admin:moderation') { await ctx.editMessageText('🚫 **محدودیت و مسدودسازی کاربران**\n\nاز این بخش می‌توانید دسترسی یک کاربر را موقت یا دائم قطع کنید.', { parse_mode: 'Markdown', reply_markup: moderationMenuKeyboard() }); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:moderation:search') { ctx.session.step = 'ADMIN_MODERATION'; await ctx.editMessageText('🔎 شناسه عددی، username یا نام کاربر را ارسال کنید:', { reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:moderation') }); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:moderation:banned') { await showModeratedList(ctx, 'BAN'); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:moderation:restricted') { await showModeratedList(ctx, 'RESTRICT'); await ctx.answerCallbackQuery(); return; }
  if (action === 'admin:moderation:unrestrict') { ctx.session.step = 'ADMIN_MODERATION'; await ctx.editMessageText('🔓 شناسه یا username کاربر را ارسال کنید تا وضعیت محدودیت/بن او را مدیریت کنیم.', { reply_markup: new InlineKeyboard().text('❌ انصراف', 'admin:moderation') }); await ctx.answerCallbackQuery(); return; }

  if (action.startsWith('admin:suggestion:')) {
    const id = action.slice('admin:suggestion:'.length); const suggestion = await prisma.suggestion.findUnique({ where: { id } });
    if (!suggestion || suggestion.status !== 'PENDING') { await ctx.answerCallbackQuery({ text: 'این پیشنهاد دیگر در انتظار بررسی نیست.', show_alert: true }); return; }
    const kb = new InlineKeyboard().text('✅ تأیید', `approve_suggestion:${id}`).text('❌ رد', `reject_suggestion:${id}`).row().text('🔙 لیست پیشنهادها', 'admin:suggestions');
    await ctx.editMessageText(`📝 **جزئیات پیشنهاد**\n\n📚 عنوان: ${suggestion.title}\n👨‍🏫 استاد: ${suggestion.instructor}\n📅 نیم‌سال: ${suggestion.semester}\n🔗 ${suggestion.link}${suggestion.description ? `\n📝 توضیحات: ${suggestion.description}` : ''}`, { parse_mode: 'Markdown', reply_markup: kb }); await ctx.answerCallbackQuery(); return;
  }
  await next();
});

async function showModeratedList(ctx: CustomContext, type: 'BAN' | 'RESTRICT'): Promise<void> {
  const now = new Date();
  const users = type === 'BAN'
    ? await prisma.user.findMany({ where: { isBanned: true }, orderBy: { updatedAt: 'desc' }, take: 20 })
    : await prisma.user.findMany({ where: { isRestricted: true }, orderBy: { updatedAt: 'desc' }, take: 20 });
  const label = type === 'BAN' ? '🚫 کاربران بن‌شده' : '⛔ کاربران محدودشده';
  const text = users.length ? `${label}\n\n` + users.map((u, i) => `${i + 1}. ${u.firstName} — 🆔 ${u.id}\n${type === 'BAN' ? (u.bannedUntil ? `⏱ تا ${u.bannedUntil.toLocaleString('fa-IR')}` : '🔒 دائم') : (u.restrictedUntil ? `⏱ تا ${u.restrictedUntil.toLocaleString('fa-IR')}` : '🔒 دائم')}`).join('\n\n') : `${label}\n\nموردی پیدا نشد.`;
  await ctx.editMessageText(text, { reply_markup: moderationMenuKeyboard() });
  void now;
}

async function findUsers(text: string) {
  const clean = text.replace(/^@/, '');
  if (/^\d+$/.test(text)) {
    const user = await prisma.user.findUnique({ where: { id: BigInt(text) } });
    return user ? [user] : [];
  }
  return prisma.user.findMany({ where: { OR: [{ username: { contains: clean, mode: 'insensitive' } }, { firstName: { contains: text, mode: 'insensitive' } }, { lastName: { contains: text, mode: 'insensitive' } }] }, take: 10 });
}

adminComposer.on('message:text', async (ctx, next): Promise<void> => {
  if (!ensureAdmin(ctx)) { await next(); return; }
  const text = ctx.message.text.trim();
  if (!text) return;

  if (ctx.session.step === 'ADMIN_SEARCH_COURSE') {
    const courses = await CourseService.searchCourses(text); ctx.session.step = 'IDLE';
    if (!courses.length) { await ctx.reply('🔎 نتیجه‌ای پیدا نشد.', { reply_markup: coursesMenuKeyboard() }); return; }
    await ctx.reply('🔎 **نتایج جستجو**\n\n' + courses.map((c, i) => `${i + 1}. ${c.title}\n👨‍🏫 ${c.instructor} | 📅 ${c.semester}\n🆔 ${c.id}`).join('\n\n'), { parse_mode: 'Markdown', reply_markup: coursesMenuKeyboard() }); return;
  }
  if (ctx.session.step === 'ADMIN_DELETE_COURSE') {
    const course = await prisma.course.findUnique({ where: { id: text } });
    if (!course) { await ctx.reply('❌ درس با این شناسه پیدا نشد.'); return; }
    ctx.session.step = 'ADMIN_CONFIRM_DELETE_COURSE'; ctx.session.pendingCourse = { title: course.title, instructor: course.instructor, semester: course.semester, link: course.link };
    await ctx.reply(`⚠️ آیا از حذف این درس مطمئن هستید؟\n\n📚 ${course.title}\n👨‍🏫 ${course.instructor}\n📅 ${course.semester}`, { reply_markup: new InlineKeyboard().text('🗑 بله، حذف شود', `admin:delete_confirm:${course.id}`).text('❌ انصراف', 'admin:courses') }); return;
  }
  if (ctx.session.step === 'ADMIN_ADD_SUPERVISOR') {
    if (!/^\d+$/.test(text)) { await ctx.reply('❌ Telegram ID باید فقط عدد باشد.'); return; }
    const id = BigInt(text);
    if (id === ctx.dbUser.id) { await ctx.reply('❌ شما خودتان ادمین هستید و نیازی به افزودن خودتان به ناظران نیست.'); return; }
    const user = await prisma.user.upsert({ where: { id }, update: { role: 'SUPERVISOR' }, create: { id, firstName: 'کاربر', role: 'SUPERVISOR' } });
    ctx.session.step = 'IDLE'; await ctx.reply(`✅ ${user.firstName} با شناسه ${id} به عنوان **SUPERVISOR** اضافه شد.`, { parse_mode: 'Markdown', reply_markup: supervisorsMenuKeyboard() }); return;
  }
  if (ctx.session.step === 'ADMIN_SEARCH_USER') {
    const users = await findUsers(text); ctx.session.step = 'IDLE';
    if (!users.length) { await ctx.reply('🔎 کاربری پیدا نشد.', { reply_markup: usersMenuKeyboard() }); return; }
    const kb = new InlineKeyboard(); users.forEach(u => kb.text(`${u.firstName} — ${u.role}`, `admin:user:${u.id}`).row()); kb.text('🔙 بازگشت', 'admin:users');
    await ctx.reply('👥 کاربران پیدا شده:', { reply_markup: kb }); return;
  }
  if (ctx.session.step === 'ADMIN_MODERATION') {
    const users = await findUsers(text); ctx.session.step = 'IDLE';
    if (!users.length) { await ctx.reply('🔎 کاربری پیدا نشد.', { reply_markup: moderationMenuKeyboard() }); return; }
    const kb = new InlineKeyboard(); users.forEach(u => kb.text(`${u.firstName}${u.isBanned ? ' 🚫' : ''}${u.isRestricted ? ' ⛔' : ''}`, `admin:moderate_user:${u.id}`).row()); kb.text('🔙 بازگشت', 'admin:moderation');
    await ctx.reply('👤 کاربر موردنظر را انتخاب کنید:', { reply_markup: kb }); return;
  }
  if (ctx.session.step === 'ADMIN_MODERATION_REASON') {
    const pending = ctx.session.pendingModeration;
    if (!pending) { ctx.session.step = 'IDLE'; await ctx.reply('❌ جلسه مدیریت منقضی شده است.'); return; }
    const reason = text.slice(0, 500);
    const until = pending.durationMinutes ? new Date(Date.now() + pending.durationMinutes * 60_000) : null;
    const data = pending.action === 'BAN'
      ? { isBanned: true, bannedUntil: until, banReason: reason }
      : { isRestricted: true, restrictedUntil: until, restrictionReason: reason };
    await prisma.user.update({ where: { id: pending.userId }, data });
    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    ctx.session.step = 'IDLE'; ctx.session.pendingModeration = undefined;
    await ctx.reply(`${pending.action === 'BAN' ? '🚫' : '⛔'} ${pending.action === 'BAN' ? 'بن' : 'محدودیت'} برای ${user?.firstName ?? 'کاربر'} اعمال شد.\n${until ? `⏱ تا ${until.toLocaleString('fa-IR')}` : '🔒 به صورت دائم'}\n📝 دلیل: ${reason}`, { reply_markup: moderationMenuKeyboard() }); return;
  }
  if (ctx.session.step === 'ADMIN_CONFIRM_DELETE_COURSE') return;
  await next();
});

adminComposer.callbackQuery(/^admin:delete_confirm:(.+)$/, async (ctx): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const deleted = await prisma.course.deleteMany({ where: { id: ctx.match[1]! } }); ctx.session.step = 'IDLE'; ctx.session.pendingCourse = undefined;
  await ctx.editMessageText(deleted.count ? '✅ درس با موفقیت حذف شد.' : '⚠️ درس قبلاً حذف شده است.', { reply_markup: new InlineKeyboard().text('📚 مدیریت دروس', 'admin:courses') }); await ctx.answerCallbackQuery();
});

adminComposer.callbackQuery(/^admin:user:(.+)$/, async (ctx): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.match[1]!) } });
  if (!user) { await ctx.answerCallbackQuery({ text: 'کاربر پیدا نشد.', show_alert: true }); return; }
  const roleAction = user.role === 'USER' ? 'SUPERVISOR' : user.role === 'SUPERVISOR' ? 'USER' : 'USER';
  const kb = new InlineKeyboard();
  if (user.role !== 'ADMIN') kb.text(user.role === 'SUPERVISOR' ? '➖ حذف ناظر' : '➕ تبدیل به ناظر', `admin:user_role:${user.id}:${roleAction}`).row();
  if (user.role !== 'ADMIN') kb.text('🚫 مدیریت دسترسی', `admin:moderate_user:${user.id}`).row();
  kb.text('🔙 کاربران', 'admin:users');
  await ctx.editMessageText(`👤 **مدیریت کاربر**\n\nنام: ${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}\n🆔 ${user.id}\n🎭 نقش: ${user.role}${user.username ? `\n🔹 @${user.username}` : ''}${user.isBanned ? '\n🚫 وضعیت: بن' : user.isRestricted ? '\n⛔ وضعیت: محدود' : '\n✅ وضعیت: عادی'}`, { parse_mode: 'Markdown', reply_markup: kb }); await ctx.answerCallbackQuery();
});

adminComposer.callbackQuery(/^admin:user_role:(.+):(USER|SUPERVISOR)$/, async (ctx): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const id = BigInt(ctx.match[1]!); const role = ctx.match[2]! as 'USER' | 'SUPERVISOR';
  if (id === ctx.dbUser.id) { await ctx.answerCallbackQuery({ text: 'نقش خودتان قابل تغییر نیست.', show_alert: true }); return; }
  const user = await prisma.user.findUnique({ where: { id } }); if (!user) { await ctx.answerCallbackQuery({ text: 'کاربر پیدا نشد.', show_alert: true }); return; }
  if (user.role === 'ADMIN') { await ctx.answerCallbackQuery({ text: 'نقش ADMIN قابل تغییر نیست.', show_alert: true }); return; }
  await prisma.user.update({ where: { id }, data: { role } });
  await ctx.editMessageText(`✅ نقش ${user.firstName} به **${role}** تغییر کرد.`, { parse_mode: 'Markdown', reply_markup: supervisorsMenuKeyboard() }); await ctx.answerCallbackQuery();
});

adminComposer.callbackQuery(/^admin:moderate_user:(.+)$/, async (ctx): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const id = BigInt(ctx.match[1]!); const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { await ctx.answerCallbackQuery({ text: 'کاربر پیدا نشد.', show_alert: true }); return; }
  if (user.role === 'ADMIN') { await ctx.answerCallbackQuery({ text: 'ADMIN قابل بن یا محدودسازی نیست.', show_alert: true }); return; }
  const kb = new InlineKeyboard()
    .text('🚫 بن دائم', `admin:ban:${id}:0`)
    .text('⛔ محدود دائم', `admin:restrict:${id}:0`).row()
    .text('⏱ بن 1 ساعت', `admin:ban:${id}:60`)
    .text('⏱ بن 24 ساعت', `admin:ban:${id}:1440`).row()
    .text('⏱ محدود 1 ساعت', `admin:restrict:${id}:60`)
    .text('⏱ محدود 24 ساعت', `admin:restrict:${id}:1440`).row()
    .text('🔓 رفع همه محدودیت‌ها', `admin:unmoderate:${id}`).row()
    .text('🔙 مدیریت کاربران', 'admin:users');
  await ctx.editMessageText(`🚫 **مدیریت دسترسی**\n\n👤 ${user.firstName}\n🆔 ${user.id}\n🎭 ${user.role}\n${user.isBanned ? '🚫 در وضعیت بن' : user.isRestricted ? '⛔ در وضعیت محدودیت' : '✅ وضعیت عادی'}\n\nمدت و نوع محدودیت را انتخاب کنید:`, { parse_mode: 'Markdown', reply_markup: kb }); await ctx.answerCallbackQuery();
});

adminComposer.callbackQuery(/^admin:(ban|restrict):(.+):(\d+)$/, async (ctx): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const action = ctx.match[1] === 'ban' ? 'BAN' : 'RESTRICT'; const userId = BigInt(ctx.match[2]!); const minutes = Number(ctx.match[3]);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role === 'ADMIN') { await ctx.answerCallbackQuery({ text: 'کاربر نامعتبر یا ADMIN است.', show_alert: true }); return; }
  ctx.session.pendingModeration = { userId, action, durationMinutes: minutes || undefined }; ctx.session.step = 'ADMIN_MODERATION_REASON';
  await ctx.reply(`📝 دلیل ${action === 'BAN' ? 'بن' : 'محدودیت'} برای ${user.firstName} را وارد کنید:`);
  await ctx.answerCallbackQuery();
});

adminComposer.callbackQuery(/^admin:unmoderate:(.+)$/, async (ctx): Promise<void> => {
  if (!ensureAdmin(ctx)) { await ctx.answerCallbackQuery({ text: '⛔ دسترسی غیرمجاز', show_alert: true }); return; }
  const id = BigInt(ctx.match[1]!); const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === 'ADMIN') { await ctx.answerCallbackQuery({ text: 'کاربر نامعتبر یا ADMIN است.', show_alert: true }); return; }
  await prisma.user.update({ where: { id }, data: { isBanned: false, bannedUntil: null, banReason: null, isRestricted: false, restrictedUntil: null, restrictionReason: null } });
  await ctx.editMessageText(`🔓 تمام محدودیت‌های ${user.firstName} برداشته شد.`, { reply_markup: moderationMenuKeyboard() }); await ctx.answerCallbackQuery();
});
