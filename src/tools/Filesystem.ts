import * as fs from 'fs/promises'
import * as path from 'path'
import { z } from 'zod'

// --- Schemas ---

export const LsSchema = z.object({
  path: z.string().describe('The directory path to list'),
  recursive: z.boolean().optional().describe('Whether to list recursively'),
  depth: z.number().optional().describe('Recursion depth (default 2)'),
})

export const ReadFileSchema = z.object({
  path: z.string().describe('The file path to read'),
  startLine: z.number().optional().describe('Start line number (1-based)'),
  endLine: z.number().optional().describe('End line number (1-based)'),
})

export const WriteFileSchema = z.object({
  path: z.string().describe('The file path to write to'),
  content: z.string().describe('The content to write'),
})

export const SmartEditSchema = z.object({
  path: z.string().describe('The file path to edit'),
  findText: z.string().describe('The precise code block to replace'),
  replaceText: z.string().describe('The new code block'),
})

export const GetFileMetadataSchema = z.object({
  path: z.string().describe('The file or directory path'),
})

import { BaseTool } from './Tool'

export class SmartEditTool extends BaseTool {
  name = 'smart_edit'
  description = 'Precisely replace a code block in a file. Checks for uniqueness and handles line endings automatically.'
  schema = SmartEditSchema

  async execute(args: z.infer<typeof SmartEditSchema>): Promise<string> {
    return smart_edit_tool(args)
  }
}

export class LsTool extends BaseTool {
  name = 'fs_ls'
  description = 'List files in a directory. Ignores node_modules, .git, etc.'
  schema = LsSchema

  async execute(args: z.infer<typeof LsSchema>): Promise<string> {
    return ls_tool(args)
  }
}

export class ReadFileTool extends BaseTool {
  name = 'fs_read_file'
  description = 'Read file content. For large files (>500 lines), defaults to first 100 lines unless range specified.'
  schema = ReadFileSchema

  async execute(args: z.infer<typeof ReadFileSchema>): Promise<string> {
    return read_file_tool(args)
  }
}

export class WriteFileTool extends BaseTool {
  name = 'fs_write_file'
  description = 'Write content to a file (overwrites). Creates directories automatically.'
  schema = WriteFileSchema

  async execute(args: z.infer<typeof WriteFileSchema>): Promise<string> {
    return write_file_tool(args)
  }
}

export class GetFileMetadataTool extends BaseTool {
  name = 'get_file_metadata'
  description = 'Get file metadata (size, lastModified, etc.). USE THIS instead of guessing size from ls.'
  schema = GetFileMetadataSchema

  async execute(args: z.infer<typeof GetFileMetadataSchema>): Promise<string> {
    return get_file_metadata_tool(args)
  }
}

// --- Implementations ---

async function getFiles(
  dir: string,
  recursive: boolean,
  maxDepth: number,
  currentDepth: number,
  ignored: Set<string>
): Promise<string[]> {
  if (currentDepth > maxDepth) return []

  let entries: string[] = []
  let items
  try {
    items = await fs.readdir(dir, { withFileTypes: true })
  } catch (e) {
    return []
  }

  for (const item of items) {
    if (ignored.has(item.name)) continue

    const fullPath = path.join(dir, item.name)
    const relativePath = path.relative(process.cwd(), fullPath) // Show relative paths for cleaner output

    entries.push(item.isDirectory() ? `${relativePath}/` : relativePath)

    if (recursive && item.isDirectory()) {
      const subEntries = await getFiles(fullPath, recursive, maxDepth, currentDepth + 1, ignored)
      entries = entries.concat(subEntries)
    }
  }

  return entries
}

export async function ls_tool(args: z.infer<typeof LsSchema>) {
  const targetPath = path.resolve(process.cwd(), args.path || '.')
  const recursive = args.recursive ?? false
  const depth = args.depth ?? 2

  const ignored = new Set(['node_modules', '.git', '.env', 'dist', '.DS_Store'])

  try {
    const stats = await fs.stat(targetPath)
    if (!stats.isDirectory()) return `Error: ${args.path} is not a directory`

    const allFiles = await getFiles(targetPath, recursive, depth, 1, ignored)

    if (allFiles.length > 100) {
      return allFiles.slice(0, 100).join('\n') + `\n\n... and ${allFiles.length - 100} more files (Too many files)`
    }

    return allFiles.length > 0 ? allFiles.join('\n') : '(empty directory)'
  } catch (error) {
    return `Error listing directory: ${error}`
  }
}

export async function read_file_tool(args: z.infer<typeof ReadFileSchema>) {
  const targetPath = path.resolve(process.cwd(), args.path)

  try {
    const content = await fs.readFile(targetPath, { encoding: 'utf-8' })
    const lines = content.split('\n')
    const totalLines = lines.length

    // Strict Pagination Logic for Large Files
    if (totalLines > 500 && args.startLine === undefined) {
      return `Error: File is too large (${totalLines} lines). Please specify a line range (startLine, endLine) to read.`
    }

    let start = (args.startLine ?? 1) - 1
    let end = args.endLine ?? totalLines

    // Safety bounds
    if (start < 0) start = 0
    if (end > totalLines) end = totalLines
    if (start >= end) return `Error: Invalid line range ${start + 1}-${end}`

    const selectedLines = lines.slice(start, end)
    const output = selectedLines.join('\n')

    const footer = `\n\nTotal lines: ${totalLines}, Showing lines ${start + 1}-${end}`
    return output + footer
  } catch (error) {
    return `Error reading file: ${error}`
  }
}

export async function write_file_tool(args: z.infer<typeof WriteFileSchema>) {
  const targetPath = path.resolve(process.cwd(), args.path)

  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, args.content, { encoding: 'utf-8' })
    return `File saved successfully (${Buffer.byteLength(args.content, 'utf-8')} bytes)`
  } catch (error) {
    return `Error writing file: ${error}`
  }
}

export async function smart_edit_tool(args: z.infer<typeof SmartEditSchema>) {
  const targetPath = path.resolve(process.cwd(), args.path)

  try {
    const content = await fs.readFile(targetPath, { encoding: 'utf-8' })

    // Normalize content and findText to LF (\n) for comparison
    const normalizedContent = content.replace(/\r\n/g, '\n')
    const normalizedFind = args.findText.replace(/\r\n/g, '\n')

    // Uniqueness Check
    // We use a simple count logic on the normalized content
    // Note: This naive split approach works for most cases where findText is not empty
    const parts = normalizedContent.split(normalizedFind)
    const matches = parts.length - 1

    if (matches === 0) {
      return `Error: findText not found in file. Please ensure indentation, spaces, and content match exactly.`
    }

    if (matches > 1) {
      return `Error: findText matches ${matches} occurrences. Please provide more context (surrounding lines) to make it unique.`
    }

    // If exactly one match, we proceed with replacement.
    // Strategy: Replace in the normalized content, then restore line endings if needed.
    // Wait, replacing in normalized content is easier, but we need to know if we should write back LF or CRLF.
    // Let's detect the dominant line ending of the original file.
    const isCRLF = content.includes('\r\n')

    const normalizedReplace = args.replaceText.replace(/\r\n/g, '\n')
    const newNormalizedContent = normalizedContent.replace(normalizedFind, normalizedReplace)

    // Restore line endings if original was CRLF
    const finalContent = isCRLF
      ? newNormalizedContent.replace(/\n/g, '\r\n')
      : newNormalizedContent

    await fs.writeFile(targetPath, finalContent, { encoding: 'utf-8' })
    return `Successfully edited '${args.path}'`

  } catch (error) {
    return `Error editing file: ${error}`
  }
}

export async function get_file_metadata_tool(args: z.infer<typeof GetFileMetadataSchema>) {
  const targetPath = path.resolve(process.cwd(), args.path)
  try {
    const stats = await fs.stat(targetPath)
    const result = {
      size: stats.size,
      isDirectory: stats.isDirectory(),
      lastModified: stats.mtime.toISOString(),
    }
    return JSON.stringify(result, null, 2)
  } catch (error) {
    return `Error getting metadata: ${error}`
  }
}

// --- Tool Definitions ---

export function getFilesystemTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'fs_ls',
        description: 'List files in a directory. Ignores node_modules, .git, etc.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' },
            recursive: { type: 'boolean', description: 'List recursively?' },
            depth: { type: 'number', description: 'Recursion depth (default 2)' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'fs_read_file',
        description: 'Read file content. For large files (>500 lines), defaults to first 100 lines unless range specified.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            startLine: { type: 'number', description: 'Start line (1-based)' },
            endLine: { type: 'number', description: 'End line (1-based)' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'fs_write_file',
        description: 'Write content to a file (overwrites). Creates directories automatically.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            content: { type: 'string', description: 'Full content' },
          },
          required: ['path', 'content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'smart_edit',
        description: 'Precisely replace a code block in a file. Checks for uniqueness and handles line endings automatically.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            findText: { type: 'string', description: 'The exact code block to replace (must be unique)' },
            replaceText: { type: 'string', description: 'The new code block' },
          },
          required: ['path', 'findText', 'replaceText'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_file_metadata',
        description: 'Get file metadata (size, lastModified, etc.). USE THIS instead of guessing size from ls.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File or directory path' },
          },
          required: ['path'],
        },
      },
    },
  ] as const
}
