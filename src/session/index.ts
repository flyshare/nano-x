import * as readline from 'readline'
import chalk from 'chalk'
import { createAgentContext, runAgent } from '../engine/AgentLoop'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export async function startInteractiveSession() {
    // console.log(chalk.blue('Entering Interactive Mode...')) // Removed to avoid cluttering the banner

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    // Maintain context across the session
    const messages: ChatCompletionMessageParam[] = createAgentContext()

    const askQuestion = () => {
        rl.question(chalk.green('\nnano-x > '), async (input) => {
            const trimmed = input.trim()

            if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
                console.log(chalk.cyan('Bye! 👋'))
                rl.close()
                process.exit(0)
            }

            if (trimmed) {
                try {
                    // Pass the SAME messages array to maintain history
                    // runAgent appends new messages to it
                    await runAgent(messages, trimmed)
                } catch (error) {
                    console.error(chalk.red('Error during execution:'), error)
                }
            }

            // Loop
            askQuestion()
        })
    }

    askQuestion()
}
