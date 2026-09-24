import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();
const bigintList = z.string().default('').transform((val, ctx) => {
  if (!val.trim()) return [] as bigint[];
  const out: bigint[] = [];
  for (const raw of val.split(',')) {
    const id = raw.trim();
    if (!/^\d+$/.test(id)) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid Telegram ID: ${id}` }); return z.NEVER; }
    out.push(BigInt(id));
  }
  return out;
});
const base = z.object({
  NODE_ENV: z.enum(['development','production','test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  BOT_TOKEN: z.string().min(1), DATABASE_URL: z.string().url(),
  WEBHOOK_DOMAIN: z.string().url().optional(), WEBHOOK_SECRET: z.string().min(16).optional(),
  INITIAL_ADMIN_IDS: bigintList, SUPERVISORS_GROUP_ID: z.coerce.bigint(), ADMIN_ONLY_GROUP_ID: z.coerce.bigint(), LINK_REQUEST_CHANNEL_ID: z.coerce.bigint().optional(),
});
const envSchema = base.superRefine((v, ctx) => { if (v.WEBHOOK_DOMAIN && !v.WEBHOOK_SECRET) ctx.addIssue({code:z.ZodIssueCode.custom,path:['WEBHOOK_SECRET'],message:'WEBHOOK_SECRET is required when WEBHOOK_DOMAIN is set'}); });
export type Env = z.infer<typeof envSchema>;
const result = envSchema.safeParse(process.env);
if (!result.success) { console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(),null,2)); process.exit(1); }
export const env: Env = result.data;
