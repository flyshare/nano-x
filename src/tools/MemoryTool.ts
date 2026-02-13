import { z } from 'zod'
import { BaseTool } from './Tool'
import { MemoryStore } from '../workspace/memory/MemoryStore'

export const RememberSchema = z.object({
  content: z.string().describe('The content to remember (fact, preference, decision, etc.)'),
  isLongTerm: z.boolean().describe('True for long-term facts/preferences, False for daily progress/notes'),
})

export class RememberTool extends BaseTool {
  name = 'remember'
  description = 'Save information to your permanent memory. Use this for user preferences, important facts, or daily progress.'
  schema = RememberSchema
  private memoryStore: MemoryStore

  constructor() {
    super()
    this.memoryStore = new MemoryStore(process.cwd())
  }

  async execute(args: z.infer<typeof RememberSchema>): Promise<string> {
    const type = args.isLongTerm ? 'long' : 'daily'
    return this.memoryStore.saveMemory(args.content, type)
  }
}
