import { z } from 'zod'

export interface Tool {
  name: string
  description: string
  schema: z.ZodObject<any>
  execute(args: any): Promise<string>
  toSchema(): any
}

export abstract class BaseTool implements Tool {
  abstract name: string
  abstract description: string
  abstract schema: z.ZodObject<any>

  abstract execute(args: any): Promise<string>

  toSchema() {
    const { properties, required } = convertZodToOpenAI(this.schema)
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: properties,
          required: required,
        },
      },
    }
  }
}

// Helper to convert Zod schema to OpenAI function parameters
function convertZodToOpenAI(schema: z.ZodObject<any>) {
  const shape = schema.shape
  const properties: any = {}
  const required: string[] = []

  for (const key in shape) {
    let field = shape[key]
    let isOptional = false

    // Unwrap optional
    if (field instanceof z.ZodOptional) {
      isOptional = true
      field = field.unwrap()
    }

    const description = field.description

    // Basic type mapping
    let type = 'string'
    if (field instanceof z.ZodNumber) type = 'number'
    if (field instanceof z.ZodBoolean) type = 'boolean'

    properties[key] = {
      type,
      description
    }

    if (!isOptional) {
      required.push(key)
    }
  }
  return { properties, required }
}
