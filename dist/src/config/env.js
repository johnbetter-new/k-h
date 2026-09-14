"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bigintList = zod_1.z.string().default('').transform((val, ctx) => {
    if (!val.trim())
        return [];
    const out = [];
    for (const raw of val.split(',')) {
        const id = raw.trim();
        if (!/^\d+$/.test(id)) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: `Invalid Telegram ID: ${id}` });
            return zod_1.z.NEVER;
        }
        out.push(BigInt(id));
    }
    return out;
});
const base = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    BOT_TOKEN: zod_1.z.string().min(1), DATABASE_URL: zod_1.z.string().url(),
    WEBHOOK_DOMAIN: zod_1.z.string().url().optional(), WEBHOOK_SECRET: zod_1.z.string().min(16).optional(),
    INITIAL_ADMIN_IDS: bigintList, SUPERVISORS_GROUP_ID: zod_1.z.coerce.bigint(), ADMIN_ONLY_GROUP_ID: zod_1.z.coerce.bigint(),
});
const envSchema = base.superRefine((v, ctx) => { if (v.WEBHOOK_DOMAIN && !v.WEBHOOK_SECRET)
    ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ['WEBHOOK_SECRET'], message: 'WEBHOOK_SECRET is required when WEBHOOK_DOMAIN is set' }); });
const result = envSchema.safeParse(process.env);
if (!result.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
}
exports.env = result.data;
