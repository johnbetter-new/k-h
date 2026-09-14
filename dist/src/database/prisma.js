"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
const client_1 = require("@prisma/client");
const logger_js_1 = require("../utils/logger.js");
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        logger_js_1.logger.info('✅ Successfully connected to PostgreSQL Database via Prisma');
    }
    catch (error) {
        logger_js_1.logger.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}
