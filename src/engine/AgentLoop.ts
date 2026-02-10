import OpenAI from 'openai'
import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import { config } from '../config'
import { execute_command, toSchema as shellToSchema } from '../tools/Shell'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
  baseURL: config.openaiBaseUrl,
})

// Helper to format date for filename
function getTimestampedFilename() {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const time = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
  return `${date}_${time}.log`
}

export async function runAgent(initialPrompt: string) {
  // Setup Logging
  const logDir = path.join(process.cwd(), 'agent_interaction')
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  const logFile = path.join(logDir, getTimestampedFilename())

  // Local logger function
  function logInteraction(step: string, data: any) {
    const timestamp = new Date().toISOString()
    const logEntry = `\n[${timestamp}] === ${step} ===\n${JSON.stringify(data, null, 2)}\n`
    fs.appendFileSync(logFile, logEntry, 'utf-8')
  }

  console.log(chalk.blue('🚀 Agent started with prompt:'), initialPrompt)
  console.log(chalk.gray(`📝 Logging interactions to: ${logFile}`))

  const systemPrompt = `You are a helpful assistant capable of executing shell commands. When asked to perform a task, use the available tools.

[Environment Info]
OS: ${process.platform} (Use ${process.platform === 'win32' ? 'Windows CMD commands like dir, type, copy' : 'Bash commands like ls, cat, cp'})
Current Directory: ${process.cwd()}
Shell: ${process.platform === 'win32' ? 'cmd.exe (via child_process)' : '/bin/sh'}

IMPORTANT OPTIMIZATION STRATEGY:
- When checking for file existence, size, or metadata, ALWAYS prefer directory listing commands (like \`dir\` on Windows or \`ls -lh\` on Linux) instead of reading the file content.
- NEVER read a file's content just to check its size. This saves tokens and prevents errors with large files.
- You are running in a ${process.platform} environment. Please strictly use commands compatible with this system. If a command fails, analyze the error message and try a valid alternative (e.g., switch from ls to dir on Windows).`

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: initialPrompt }
  ]

  const tools = [shellToSchema()]
  let iterations = 0
  const MAX_ITERATIONS = 10

  while (iterations < MAX_ITERATIONS) {
    iterations++
    console.log(chalk.gray(`\n🔄 Iteration ${iterations}/${MAX_ITERATIONS}`))

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
        console.log(chalk.yellow('🤖 Thought:'), message.content)
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(chalk.cyan(`🛠️  Tool calls detected: ${message.tool_calls.length}`))

        const toolResults = await Promise.all(message.tool_calls.map(async (toolCall) => {
          const functionName = toolCall.function.name
          const args = JSON.parse(toolCall.function.arguments)

          console.log(chalk.dim(`   Executing ${functionName} with args:`), JSON.stringify(args))

          let resultContent = ''

          if (functionName === 'shell_execute_command') {
            try {
              const { output, exitCode } = await execute_command(args)
              resultContent = JSON.stringify({ exitCode, output })
            } catch (error) {
              resultContent = JSON.stringify({ error: String(error) })
            }
          } else {
            resultContent = 'Error: Unknown tool'
          }

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

        // Log tool results before next iteration
        logInteraction(`Iteration ${iterations} Tool Results`, toolResults)
        messages.push(...toolResults)
        continue
      }

      console.log(chalk.green('✅ Task completed.'))
      return message.content

    } catch (error) {
      console.error(chalk.red('❌ Error in agent loop:'), error)
      logInteraction(`Iteration ${iterations} Error`, error)
      break
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn(chalk.red('⚠️ Max iterations reached. Stopping.'))
  }
}
