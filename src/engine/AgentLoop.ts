import OpenAI from 'openai'
import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import { config } from '../config'
import { ToolRegistry, truncateOutput } from '../tools/Registry'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { ContextBuilder } from '../context/ContextBuilder'

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
  baseURL: config.openaiBaseUrl,
})

export function createAgentContext(): ChatCompletionMessageParam[] {
  const builder = new ContextBuilder(process.cwd())
  const systemPrompt = builder.buildSystemPrompt()
  return [{ role: 'system', content: systemPrompt }]
}

export async function runAgent(
  messages: ChatCompletionMessageParam[],
  userPrompt?: string
): Promise<ChatCompletionMessageParam[]> {
  // Setup Logging (ensure directory exists)
  const logDir = path.join(process.cwd(), 'agent_interaction')
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  // Use a fixed log file for the session or generate one? 
  // Let's keep the timestamped one for now, but maybe we want to reuse it if called multiple times in one session?
  // For simplicity, let's append to the same file based on the current time (created at module load or first call).
  // Actually, let's just use a simple one for now.
  const logFile = path.join(logDir, `session_${new Date().toISOString().split('T')[0]}.log`)

  // Local logger function
  function logInteraction(step: string, data: any) {
    const timestamp = new Date().toISOString()
    const logEntry = `\n[${timestamp}] === ${step} ===\n${JSON.stringify(data, null, 2)}\n`
    fs.appendFileSync(logFile, logEntry, 'utf-8')
  }

  if (userPrompt) {
    // Dynamic Skill Injection: Update System Prompt based on User Input
    try {
        const builder = new ContextBuilder(process.cwd());
        const newSystemPrompt = builder.buildSystemPrompt(userPrompt);
        
        if (messages.length > 0 && messages[0].role === 'system') {
            messages[0].content = newSystemPrompt;
            // console.log(chalk.gray('[System Prompt Updated with Skills]'));
        }
    } catch (e) {
        console.error("Failed to update system prompt:", e);
    }

    console.log(chalk.blue('🚀 User:'), userPrompt)
    messages.push({ role: 'user', content: userPrompt })
  }

  const registry = new ToolRegistry()
  const tools = registry.getDefinitions()
  let iterations = 0
  const MAX_ITERATIONS = 10

  while (iterations < MAX_ITERATIONS) {
    iterations++

    try {
      logInteraction(`Iteration ${iterations} Request`, { model: config.openaiModel, messages })

      const response = await openai.chat.completions.create({
        model: config.openaiModel,
        messages,
        tools: tools,
        tool_choice: 'auto',
      })

      const message = response.choices[0].message
      logInteraction(`Iteration ${iterations} Response`, message)
      messages.push(message)

      if (message.content) {
        console.log(chalk.yellow('🤖 Agent:'), message.content)
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(chalk.cyan(`🛠️  Tool calls detected: ${message.tool_calls.length}`))

        const toolResults = await Promise.all(message.tool_calls.map(async (toolCall) => {
          // Narrowing type
          if (toolCall.type !== 'function') {
            return {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: 'Error: Only function tools are supported'
            }
          }

          const functionName = toolCall.function.name
          const args = JSON.parse(toolCall.function.arguments)

          console.log(chalk.dim(`   Executing ${functionName} with args:`), JSON.stringify(args))

          let resultContent = ''

          try {
            const tool = registry.getTool(functionName)
            if (tool) {
              resultContent = await tool.execute(args)
            } else {
              resultContent = `Error: Unknown tool '${functionName}'`
            }
          } catch (error) {
            resultContent = `Error executing ${functionName}: ${String(error)}`
          }

          // --- Token Guard ---
          resultContent = truncateOutput(resultContent, 5000)
          // -------------------

          // Truncate long output for log display
          const displayContent = resultContent.length > 200
            ? resultContent.slice(0, 200) + '... (truncated)'
            : resultContent
          console.log(chalk.dim(`   Result:`), displayContent)

          return {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: resultContent
          }
        }))

        logInteraction(`Iteration ${iterations} Tool Results`, toolResults)
        messages.push(...toolResults)
        continue
      }

      // No tool calls -> Final answer
      return messages

    } catch (error: any) {
      // Self-Healing for Context Limit
      if (error?.status === 400 || (error?.error?.code === 'context_length_exceeded')) {
        console.warn(chalk.red('⚠️  Context limit exceeded (400). Triggering self-healing...'))

        // Keep System Prompt (index 0), clear the rest, add warning
        if (messages.length > 0) {
          messages.splice(1, messages.length - 1, {
            role: 'system',
            content: '由于之前的输出过载导致系统重启，请重新尝试并使用更精确的工具。'
          })
        }

        logInteraction(`Iteration ${iterations} Self-Healing`, { action: 'Context Cleared' })
        continue
      }

      console.error(chalk.red('❌ Error in agent loop:'), error)
      logInteraction(`Iteration ${iterations} Error`, error)
      break
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn(chalk.red('⚠️ Max iterations reached. Stopping.'))
  }

  return messages
}
