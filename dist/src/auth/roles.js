"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.isSupervisorOrAdmin = void 0;
exports.resolveUserRole = resolveUserRole;
const client_1 = require("@prisma/client");
const env_js_1 = require("../config/env.js");
const prisma_js_1 = require("../database/prisma.js");
async function resolveUserRole(telegramId) {
    if (env_js_1.env.INITIAL_ADMIN_IDS.includes(telegramId))
        return client_1.Role.ADMIN;
    const user = await prisma_js_1.prisma.user.findUnique({ where: { id: telegramId }, select: { role: true } });
    return user?.role ?? client_1.Role.USER;
}
const isSupervisorOrAdmin = (role) => role === client_1.Role.SUPERVISOR || role === client_1.Role.ADMIN;
exports.isSupervisorOrAdmin = isSupervisorOrAdmin;
const isAdmin = (role) => role === client_1.Role.ADMIN;
exports.isAdmin = isAdmin;
