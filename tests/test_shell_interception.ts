import { execute_command } from '../src/tools/Shell'
import chalk from 'chalk'

async function runTest() {
  console.log(chalk.blue('--- Testing Shell Interception Logic ---'))
  
  // Test 1: Normal command
  console.log('\n1. Testing normal command (echo hello)...')
  const res1 = await execute_command({ command: 'echo hello' })
  console.log('Result:', JSON.stringify(res1))
  
  if (res1.exitCode === 0 && res1.output.includes('hello')) {
      console.log(chalk.green('✅ Normal command passed.'))
  } else {
      console.error(chalk.red('❌ Normal command failed.'))
  }
  
  // Test 2: Forbidden smart_edit command
  console.log('\n2. Testing forbidden command (npm run smart_edit)...')
  const res2 = await execute_command({ command: 'npm run smart_edit src/main.ts' })
  console.log('Result:', JSON.stringify(res2))
  
  if (res2.exitCode === 1 && res2.output.includes('Error: Do not call smart_edit via shell')) {
      console.log(chalk.green('✅ Interception logic PASSED!'))
  } else {
      console.error(chalk.red('❌ Interception logic FAILED! It executed the command.'))
  }
}

runTest()
