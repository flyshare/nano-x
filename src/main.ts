#!/usr/bin/env node
import './setupEnv'
import { program } from 'commander'
import chalk from 'chalk'
import { z } from 'zod'
import * as readline from 'readline/promises'
import { stdin as input, stdout as output } from 'process'

import { config } from './config'
import * as Engine from '@engine/index'
import * as Tools from '@tools/index'
import * as Session from '@session/index'
import { runAgent, createAgentContext } from '@engine/AgentLoop'

program
  .name('nano-x')
  .description('Nano-X CLI')
  .version('0.0.1')

// Validate Env
const Schema = z.object({ NODE_ENV: z.string().optional() })
const parsed = Schema.safeParse(process.env)

async function main() {
  // ASCII Art Banner
  console.log(chalk.bold.cyan(`
   _  _   __   _  _   __      __  __ 
  ( \\( ) / _\\ ( \\( ) /  \\ ___ (  )/  )
   )  ( /    \\ )  ( (  O )___  )  (  
  (_)\\_)\\_/\\_/(_)\\_) \\__/     (__\\__) 
  `))
  console.log(chalk.gray(`  v0.0.1 - AI Agent Framework`))
  console.log(chalk.gray('----------------------------------------'))
  console.log(`OS: ${chalk.green(process.platform)} | CWD: ${chalk.green(process.cwd())}`)
  console.log(`Model: ${chalk.cyan(config.openaiModel)}`)
  console.log(chalk.gray('----------------------------------------'))
  console.log(chalk.yellow('Type "exit" or "quit" to leave.'))
  console.log()

  const rl = readline.createInterface({ input, output })

  // Initialize Context
  let messages = createAgentContext()

  // REPL Loop
  while (true) {
    const answer = await rl.question(chalk.green('nano-x > '))
    const inputStr = answer.trim()

    if (inputStr === 'exit' || inputStr === 'quit') {
      console.log(chalk.cyan('Bye! 👋'))
      rl.close()
      process.exit(0)
    }

    if (!inputStr) continue

    try {
      // Pass the context to the agent
      // The agent will append the user prompt, run the loop, and append the response/tool-results
      messages = await runAgent(messages, inputStr)
    } catch (error) {
      console.error(chalk.red('Error during agent execution:'), error)
    }

    console.log() // spacer
  }
}

if (require.main === module) {
  main().catch(console.error)
}
