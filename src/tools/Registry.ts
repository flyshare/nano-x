import { Tool } from './Tool'
import { SmartEditTool, LsTool, ReadFileTool, WriteFileTool, GetFileMetadataTool } from './Filesystem'
import { ShellExecuteTool } from './Shell'
import { RememberTool } from './MemoryTool'
import { WebSearchTool, WebFetchTool } from './WebTools'
import { SpawnSubAgentTool } from '../engine/SubAgent'

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  constructor() {
    this.register(new ShellExecuteTool())
    this.register(new LsTool())
    this.register(new ReadFileTool())
    this.register(new WriteFileTool())
    this.register(new SmartEditTool())
    this.register(new GetFileMetadataTool())
    this.register(new RememberTool())
    this.register(new WebSearchTool())
    this.register(new WebFetchTool())
    this.register(new SpawnSubAgentTool())
  }

  register(tool: Tool) {
    this.tools.set(tool.name, tool)
  }

  getDefinitions() {
    return Array.from(this.tools.values()).map(t => t.toSchema())
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name)
  }
}

/**
 * Truncates output to a maximum length, keeping the beginning and end.
 * @param output The string output to truncate
 * @param maxLength The maximum allowed length (default: 5000)
 * @returns The truncated string
 */
export function truncateOutput(output: string, maxLength: number = 5000): string {
  if (output.length <= maxLength) {
    return output
  }

  const half = Math.floor(maxLength / 2)
  const head = output.slice(0, half)
  const tail = output.slice(-half)
  const removedChars = output.length - maxLength

  const warning = `\n\n... [Output truncated] ...\n[Warning: ${removedChars} characters removed from middle. Use specialized tools to read specific parts.]\n\n`

  return head + warning + tail
}
