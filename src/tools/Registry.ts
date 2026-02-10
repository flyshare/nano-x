
import chalk from 'chalk'

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
