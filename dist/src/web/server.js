"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebServer = createWebServer;
const express_1 = __importDefault(require("express"));
const grammy_1 = require("grammy");
const env_js_1 = require("../config/env.js");
const prisma_js_1 = require("../database/prisma.js");
function createWebServer(bot) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Health Check Endpoint
    app.get('/health', async (_req, res) => {
        try {
            await prisma_js_1.prisma.$queryRaw `SELECT 1`;
            res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
        }
        catch {
            res.status(500).json({ status: 'error', message: 'Database unhealthy' });
        }
    });
    // Secure Telegram Webhook Handler Endpoint
    if (env_js_1.env.WEBHOOK_DOMAIN) {
        app.use('/webhook', (0, grammy_1.webhookCallback)(bot, 'express', {
            secretToken: env_js_1.env.WEBHOOK_SECRET,
        }));
    }
    return app;
}
