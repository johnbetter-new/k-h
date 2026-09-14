import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  WEBHOOK_DOMAIN: z.string().url('WEBHOOK_DOMAIN must be a valid URL').optional(),
  WEBHOOK_SECRET: z.string().min(16).optional(),
  
  INITIAL_ADMIN_IDS: z.string().transform((val) =>
    val.split(',').map((id) => BigInt(id.trim())).filter((id) => !isNaN(Number(id)))
  ),
  SUPERVISORS_GROUP_ID: z.coerce.bigint(),
  ADMIN_ONLY_GROUP_ID: z.coerce.bigint(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
