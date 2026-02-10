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

export const EditFileSchema = z.object({
  path: z.string().describe('The file path to edit'),
  oldText: z.string().describe('The exact text to replace'),
  newText: z.string().describe('The new text'),
})

export const GetFileMetadataSchema = z.object({
  path: z.string().describe('The file or directory path'),
})

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

export async function edit_file_tool(args: z.infer<typeof EditFileSchema>) {
  const targetPath = path.resolve(process.cwd(), args.path)

  try {
    const content = await fs.readFile(targetPath, { encoding: 'utf-8' })

    if (!content.includes(args.oldText)) {
      return `Error: oldText not found in file. Please ensure exact match (including whitespace).`
    }

    // Safety check for multiple occurrences could be added here, 
    // but requirement said "simple string replacement".
    // We will replace only the first occurrence to be safe-ish.
    const newContent = content.replace(args.oldText, args.newText)

    await fs.writeFile(targetPath, newContent, { encoding: 'utf-8' })
    return `File edited successfully.`
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
        name: 'fs_edit_file',
        description: 'Replace text in a file. Use this for small changes to avoid rewriting large files.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            oldText: { type: 'string', description: 'Text to replace' },
            newText: { type: 'string', description: 'Replacement text' },
          },
          required: ['path', 'oldText', 'newText'],
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
