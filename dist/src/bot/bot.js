"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBot = createBot;
const grammy_1 = require("grammy");
const env_js_1 = require("../config/env.js");
const auth_middleware_js_1 = require("./middlewares/auth.middleware.js");
const session_middleware_js_1 = require("./middlewares/session.middleware.js");
const start_js_1 = require("./commands/start.js");
const course_js_1 = require("./commands/course.js");
const suggest_js_1 = require("./commands/suggest.js");
const admin_js_1 = require("./commands/admin.js");
const suggestion_callback_js_1 = require("./callbacks/suggestion.callback.js");
const course_callback_js_1 = require("./callbacks/course.callback.js");
const logger_js_1 = require("../utils/logger.js");
function createBot() {
    const bot = new grammy_1.Bot(env_js_1.env.BOT_TOKEN);
    // Global Middlewares
    bot.use(auth_middleware_js_1.authMiddleware);
    bot.use(session_middleware_js_1.dbSessionMiddleware);
    // Modular Composers & Handlers
    bot.use(start_js_1.startComposer);
    bot.use(admin_js_1.adminComposer);
    bot.use(suggest_js_1.suggestComposer);
    bot.use(course_js_1.courseComposer);
    bot.use(suggestion_callback_js_1.suggestionCallbackComposer);
    bot.use(course_callback_js_1.courseCallbackComposer);
    // Centralized Error Boundary
    bot.catch((err) => {
        logger_js_1.logger.error(`Error in update ${err.ctx.update.update_id}:`, err.error);
        err.ctx.reply('❌ یک خطای غیرمنتظره رخ داد. لطفاً مجدداً تلاش کنید.').catch(() => { });
    });
    return bot;
}
