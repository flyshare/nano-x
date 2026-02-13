
import { z } from 'zod'
import { ToolRegistry } from '../src/tools/Registry'
import { BaseTool } from '../src/tools/Tool'

// Mock ZodOptional check
console.log('--- Checking Schema Generation ---')

const registry = new ToolRegistry()
const defs = registry.getDefinitions()

defs.forEach(def => {
    console.log(`Tool: ${def.function.name}`)
    console.log('Required:', def.function.parameters.required)
    console.log('Properties:', JSON.stringify(def.function.parameters.properties, null, 2))
    console.log('---')
})
