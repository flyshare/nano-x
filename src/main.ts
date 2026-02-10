import { program } from 'commander'
import chalk from 'chalk'
import { z } from 'zod'
import 'dotenv/config'
import { config } from './config'
import * as Engine from '@engine/index'
import * as Tools from '@tools/index'
import { execute_command, toSchema } from '@tools/Shell'
import * as Session from '@session/index'

program
  .name('nano-x')
  .description('Nano-X CLI')
  .version('0.0.1')

const Schema = z.object({ NODE_ENV: z.string() })
const parsed = Schema.safeParse(process.env)



console.log(chalk.green('Commander ready'))
console.log('Env valid:', parsed.success)
console.log('Aliases OK:', !!Engine && !!Tools && !!Session)
console.log('OpenAI key set:', !!config.openaiApiKey)
console.log('OpenAI base url:', config.openaiBaseUrl || '(empty)')

async function demoShell() {
  const r = await execute_command({ command: 'node -v' })
  console.log('Shell exit code:', r.exitCode)
  console.log('Shell output:', r.output.trim())
  console.log('Shell toSchema:', JSON.stringify(toSchema()))

  const bad = await execute_command({ command: 'unknown_command_abc' })
  console.log('Bad exit code:', bad.exitCode)
  console.log('Bad output:', bad.output)
}

// 演示 AgentLoop
import { runAgent } from '@engine/AgentLoop'

async function main() {
  if (process.argv.includes('--test-agent')) {
    // 简单测试，不用太多 token
    await runAgent('请列出当前目录下的所有文件，并告诉我 package.json 文件的大小。')
  } else {
    // 默认演示 Shell 工具
    await demoShell()
    console.log(chalk.cyan('\nTip: Run with --test-agent to test the full agent loop.'))
  }
}

main()
