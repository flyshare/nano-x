import 'dotenv/config'
import { z } from 'zod'

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional().transform(v => v ?? ''),
  OPENAI_BASE_URL: z.string().min(1).optional().transform(v => v ?? ''),
})

const parsed = EnvSchema.safeParse(process.env)
const { OPENAI_API_KEY, OPENAI_BASE_URL } = parsed.success
  ? parsed.data
  : { OPENAI_API_KEY: '', OPENAI_BASE_URL: '' }

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: OPENAI_API_KEY,
  openaiBaseUrl: OPENAI_BASE_URL,
  openaiModel: process.env.OPENAI_MODEL || 'moonshot-v1-8k',
}

export function assertOpenAIConfig() {
  const schema = z.object({
    openaiApiKey: z.string().min(1),
    openaiBaseUrl: z.string().min(1),
  })
  const r = schema.safeParse(config)
  if (!r.success) {
    throw new Error('Missing OPENAI_API_KEY or OPENAI_BASE_URL')
  }
  return r.data
}
