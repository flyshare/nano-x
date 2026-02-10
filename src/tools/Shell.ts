import { exec } from 'node:child_process'
import { z } from 'zod'
import * as iconv from 'iconv-lite'

export const ShellParamsSchema = z.object({
  command: z.string().min(1),
})

export type ShellParams = z.infer<typeof ShellParamsSchema>

export async function execute_command({ command }: ShellParams): Promise<{
  output: string
  exitCode: number
}> {
  return new Promise((resolve) => {
    // On Windows, defaults to GBK (cp936), so we use iconv to decode.
    // We do NOT use 'chcp 65001' because it fails to affect cmd.exe's own error messages (stderr),
    // causing mixed encoding or remaining in GBK.
    const isWin = process.platform === 'win32'

    // Use buffer encoding to handle potential multi-byte characters correctly with iconv
    const child = exec(command, {
      maxBuffer: 1024 * 1024 * 16,
      windowsHide: true,
      encoding: 'buffer'
    })

    const chunks: Buffer[] = []

    child.stdout?.on('data', (d: Buffer) => {
      chunks.push(d)
    })

    child.stderr?.on('data', (d: Buffer) => {
      chunks.push(d)
    })

    child.on('error', (err) => {
      const encoding = isWin ? 'cp936' : 'utf-8'
      chunks.push(Buffer.from(String(err), 'utf-8')) // err is usually JS string, safe to use utf-8 or default
      const output = iconv.decode(Buffer.concat(chunks), encoding)
      resolve({ output, exitCode: 1 })
    })

    child.on('close', (code) => {
      const encoding = isWin ? 'cp936' : 'utf-8'
      const output = iconv.decode(Buffer.concat(chunks), encoding)
      resolve({ output, exitCode: code ?? 0 })
    })
  })
}

export function toSchema() {
  return {
    type: 'function',
    function: {
      name: 'shell_execute_command',
      description: 'Execute a shell command and return combined stdout+stderr output.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
        },
        required: ['command'],
        additionalProperties: false,
      },
    },
  }
}
