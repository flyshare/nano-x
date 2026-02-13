#!/usr/bin/env node
import 'dotenv/config'
import { Command } from 'commander'
import * as path from 'path'
import * as fs from 'fs'
import chalk from 'chalk'
import { createAgentContext, runAgent } from './engine/AgentLoop'
import { config, assertOpenAIConfig } from './config'
import { ToolRegistry } from './tools/Registry'
import { startInteractiveSession } from './session/index'
import './tools/index' // Register tools

// Setup CLI
const program = new Command()

program
  .name('nano-x')
  .description('A minimal AI agent that can manipulate files and execute shell commands')
  .version('1.0.0')

function printBanner() {
    console.clear()
    
    const logo = `
 _   _    __   _   _    ___      __    __
| \\ | |  / _ \\ | \\ | |  / _ \\    \\ \\  / /
|  \\| | / /_\\ \\|  \\| | | | | |    \\ \\/ /
| |\\  | |  _  || |\\  | | |_| |    / /\\ \\
|_| \\_| |_| |_||_| \\_|  \\___/    /_/  \\_\\
`
    console.log(chalk.cyan(logo))
    console.log(chalk.gray('v0.0.1 - AI Agent Framework'))
    console.log('------------------------------------------------------------')
    console.log(`OS: ${chalk.green(process.platform)}`)
    console.log(`CWD: ${chalk.green(process.cwd())}`)
    console.log(`Model: ${chalk.blue(config.openaiModel || 'unknown')}`)
    console.log('------------------------------------------------------------')
    console.log(chalk.yellow('Type "exit" or "quit" to leave.'))
}

program
  .argument('[prompt]', 'The initial prompt for the agent')
  .option('--subagent <instruction>', 'Run as a sub-agent with specific instruction')
  .action(async (prompt, options) => {
    try {
      assertOpenAIConfig()
    } catch (e) {
      console.error(chalk.red(e))
      process.exit(1)
    }

    // Check if running as sub-agent
    if (options.subagent) {
        // Sub-agent mode: minimal UI, direct execution
        const instruction = options.subagent
        console.log(chalk.magenta(`[Sub-Agent] Initializing...`))
        console.log(chalk.gray(`[Sub-Agent] Task: ${instruction}`))
        
        // Load tools
        const registry = new ToolRegistry()
        
        // Execute task
        try {
            const messages = createAgentContext()
            // Add a specific system message for sub-agent persona if needed?
            // For now, standard context + user prompt is enough.
            const result = await runAgent(messages, instruction)
            console.log(chalk.green(`\n[Sub-Agent] Task Complete.`))
            // We rely on runAgent or tools to output the final result.
            // The process exit code 0 indicates success.
            process.exit(0)
        } catch (error) {
            console.error(chalk.red(`[Sub-Agent] Error: ${error}`))
            process.exit(1)
        }
        return
    }

    // Print Banner immediately
    printBanner()

    // Verify Tool Definitions Loading
    const registry = new ToolRegistry()
    const toolCount = registry.getDefinitions().length
    // console.log(`Tool Definitions Loaded: ${toolCount}`) // Hidden to keep banner clean as per requirement? 
    // Wait, requirement says "Print banner... then show prompt". 
    // The previous log "Nano-x AI Agent Started..." should be removed/replaced by banner.
    // The tool count check should probably be silent unless error.
    
    if (toolCount < 6) {
        console.error(chalk.red(`CRITICAL ERROR: Only ${toolCount} tools loaded. Expected at least 6.`))
    }

    if (!prompt) {
      // Interactive mode
      await startInteractiveSession()
    } else {
      // Single run mode
      const messages = createAgentContext()
      await runAgent(messages, prompt)
      console.log(chalk.cyan('Bye! 👋'))
    }
  })

program.parse()
