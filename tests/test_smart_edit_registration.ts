import { ToolRegistry } from '../src/tools/Registry'
import * as path from 'path'
import * as fs from 'fs'

async function runTest() {
  console.log('--- Testing Smart Edit Registration (Offline Mode) ---')
  
  // 1. Verify Registry
  const registry = new ToolRegistry()
  const tools = registry.getTools()
  const smartEditSchema = tools.find((t: any) => t.function.name === 'smart_edit')
  
  if (smartEditSchema) {
    console.log('✅ SmartEditTool is registered in ToolRegistry.')
    // console.log('Schema:', JSON.stringify(smartEditSchema, null, 2))
  } else {
    console.error('❌ SmartEditTool is NOT registered.')
    return
  }
  
  // 2. Simulate Execution
  const tool = registry.getTool('smart_edit')
  if (!tool) {
     console.error('❌ Could not retrieve tool instance.')
     return
  }
  
  console.log(`Executing ${tool.name} with args: { path: 'registry_test.txt', ... }`)
  
  // Create a dummy file to edit
  const testFile = path.resolve(__dirname, 'registry_test.txt')
  fs.writeFileSync(testFile, 'Line 1\nLine 2\nLine 3', 'utf-8')
  
  try {
      const result = await tool.execute({
          path: testFile,
          findText: 'Line 2',
          replaceText: 'Line 2 - Edited'
      })
      console.log('Result:', result)
      
      const content = fs.readFileSync(testFile, 'utf-8')
      if (content.includes('Line 2 - Edited')) {
          console.log('✅ Tool execution via Class/Registry successful.')
      } else {
          console.error('❌ Tool execution failed.')
      }
      
  } catch (e) {
      console.error('Error:', e)
  } finally {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile)
  }
}

runTest()
