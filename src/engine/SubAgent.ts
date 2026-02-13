
import { z } from 'zod'
import { BaseTool } from '../tools/Tool'
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

// --- SubAgent Tool ---

export const SpawnSubAgentSchema = z.object({
    instruction: z.string().describe('The detailed instruction for the sub-agent.'),
})

export class SpawnSubAgentTool extends BaseTool {
    name = 'spawn_sub_agent'
    description = 'Spawn a sub-agent to handle a complex task independently. Use this for code analysis, refactoring, or multi-step operations that can be parallelized or isolated.'
    schema = SpawnSubAgentSchema

    async execute(args: z.infer<typeof SpawnSubAgentSchema>): Promise<string> {
        const instruction = args.instruction.trim()
        if (!instruction) return 'Error: Instruction cannot be empty.'

        console.log(`\n[Master] Spawning Sub-Agent for task: "${instruction}"...\n`)

        return new Promise((resolve, reject) => {
            // Determine the executable path
            // In dev (ts-node): npx tsx src/main.ts
            // In prod (node): node dist/main.js

            const isTs = __filename.endsWith('.ts')
            const scriptPath = isTs
                ? path.join(process.cwd(), 'src', 'main.ts')
                : path.join(process.cwd(), 'dist', 'main.js')

            // Use npx tsx for TS files, node for JS files
            const cmd = isTs ? 'npx' : 'node'
            const cmdArgs = isTs
                ? ['tsx', scriptPath, '--subagent', instruction]
                : [scriptPath, '--subagent', instruction]

            console.log(`[Master] Executing: ${cmd} ${cmdArgs.join(' ')}`)

            const child = spawn(cmd, cmdArgs, {
                cwd: process.cwd(),
                env: { ...process.env, SUB_AGENT_MODE: 'true', FORCE_COLOR: '1' },
                stdio: ['ignore', 'pipe', 'pipe'] // Pipe stdout/stderr
            })

            let output = ''
            let errorOutput = ''

            child.stdout.on('data', (data) => {
                const str = data.toString()
                output += str
                // Stream sub-agent output to master console with prefix
                // Only print if not excessively verbose, or just stream it
                process.stdout.write(str.split('\n').map((l: string) => l ? `[Sub] ${l}` : l).join('\n'))
            })

            child.stderr.on('data', (data) => {
                const str = data.toString()
                errorOutput += str
                process.stderr.write(str.split('\n').map((l: string) => l ? `[Sub:Err] ${l}` : l).join('\n'))
            })

            child.on('close', (code) => {
                console.log(`\n[Master] Sub-Agent exited with code ${code}.\n`)
                if (code === 0) {
                    // Truncate output to last 2000 chars to avoid token limit
                    const summary = output.length > 2000 ? output.slice(-2000) : output
                    resolve(`Sub-Agent Execution Completed.\n\nOutput Summary:\n${summary}`)
                } else {
                    resolve(`Sub-Agent Failed (Exit Code: ${code}).\n\nError Log:\n${errorOutput}`)
                }
            })

            child.on('error', (err) => {
                resolve(`Failed to spawn sub-agent: ${err.message}`)
            })
        })
    }
}
