import OpenAI from 'openai'
import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import { config } from '../config'
import { execute_command, toSchema as shellToSchema } from '../tools/Shell'
import { truncateOutput } from '../tools/Registry'
import {
  getFilesystemTools,
  ls_tool,
  read_file_tool,
  write_file_tool,
  edit_file_tool,
  get_file_metadata_tool
} from '../tools/Filesystem'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
  baseURL: config.openaiBaseUrl,
})

export function createAgentContext(): ChatCompletionMessageParam[] {
  const systemPrompt = `You are a helpful assistant capable of executing shell commands and manipulating files.

[Environment Info]
OS: ${process.platform}
Current Directory: ${process.cwd()}

[Tool Usage Guidelines]
- **File Operations**: You have dedicated tools for file manipulation (\`fs_ls\`, \`fs_read_file\`, \`fs_write_file\`, \`fs_edit_file\`).
  - Use \`fs_ls\` to explore directories. It filters out node_modules/.git by default.
  - Use \`fs_read_file\` to read files.
    - **PROHIBITED**: You MUST NOT use \`type\`, \`cat\`, \`dir\` or pipes to read file content. Use \`fs_read_file\`.
    - **Large Files**: If a file is large (>500 lines), you MUST specify a line range (startLine, endLine). The tool will reject requests without it.
  - **Editing**: PREFER \`fs_edit_file\` over \`fs_write_file\` for small changes. This saves tokens and avoids rewriting entire files.
  - Only use \`fs_write_file\` when creating new files or overwriting small files entirely.
  - **Metadata**: Strictly prohibit guessing file size from directory listing. If you need file size, you MUST use the \`get_file_metadata\` tool.
- **Shell**: Use \`shell_execute_command\` for general system tasks or when no specific tool is available.
- **Optimization**: The system has a Token Guard that truncates output > 5000 characters. If you need to read a very large file, read it in chunks using line numbers.
`

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
    console.log(chalk.blue('🚀 User:'), userPrompt)
    messages.push({ role: 'user', content: userPrompt })
  }

  const tools = [shellToSchema(), ...getFilesystemTools()]
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
            if (functionName === 'shell_execute_command') {
              const { output, exitCode } = await execute_command(args)
              resultContent = JSON.stringify({ exitCode, output })
            } else if (functionName === 'fs_ls') {
              resultContent = await ls_tool(args)
            } else if (functionName === 'fs_read_file') {
              resultContent = await read_file_tool(args)
            } else if (functionName === 'fs_write_file') {
              resultContent = await write_file_tool(args)
            } else if (functionName === 'fs_edit_file') {
              resultContent = await edit_file_tool(args)
            } else if (functionName === 'get_file_metadata') {
              resultContent = await get_file_metadata_tool(args)
            } else {
              resultContent = 'Error: Unknown tool'
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
