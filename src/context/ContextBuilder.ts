import * as fs from 'fs';
import * as path from 'path';
import { MemoryStore } from '../workspace/memory/MemoryStore';
import { SkillsLoader } from '../skills/SkillsLoader';
import { truncateOutput } from '../tools/Registry';

export class ContextBuilder {
  private workspace: string;
  private memoryStore: MemoryStore;
  private skillsLoader: SkillsLoader;
  private readonly BOOTSTRAP_FILES = ["AGENTS.md", "SOUL.md", "USER.md", "TOOLS.md", "IDENTITY.md"];

  constructor(workspaceRoot: string) {
    // The workspace directory is 'workspace/' relative to the root
    this.workspace = path.join(workspaceRoot, 'workspace');
    this.ensureWorkspace();
    this.memoryStore = new MemoryStore(workspaceRoot); // MemoryStore expects root, it appends workspace internally
    this.skillsLoader = new SkillsLoader(workspaceRoot);
    this.skillsLoader.scanSkills();
    this.ensureBootstrapFiles();
  }

  public buildSystemPrompt(userInput?: string): string {
    const parts: string[] = [];

    // 1. Identity & Environment & Workspace Status
    parts.push(this.getIdentity());

    // 2. Memory (Second Brain) - Injected before Bootstrap files to prioritize recent learnings
    const rawMemory = this.memoryStore.getMemoryContext();
    if (rawMemory && rawMemory.trim().length > 0) {
      // Musk-style Token Protection: 3000 chars limit
      const truncatedMemory = truncateOutput(rawMemory, 3000);
      parts.push(`## Memory (Second Brain)\n\n${truncatedMemory}`);
    }

    // 3. Skills Progressive Loading
    // Always inject summary
    parts.push(`## Available Skills\n${this.skillsLoader.getSkillsSummary()}`);

    // Dynamic injection based on user input
    if (userInput) {
      const matchedSkills = this.skillsLoader.matchSkills(userInput);
      if (matchedSkills) {
        parts.push(`# Active Skill Context\n\n${matchedSkills}`);
      }
    }

    // 4. Bootstrap Files
    const bootstrapContent = this.loadBootstrapFiles();
    if (bootstrapContent) {
      parts.push(bootstrapContent);
    }

    // 5. Permission Constraint & Record Instinct & Skill Instinct
    parts.push(this.getPermissionConstraint());

    return parts.join('\n\n---\n\n');
  }

  private ensureWorkspace() {
    if (!fs.existsSync(this.workspace)) {
      try {
        fs.mkdirSync(this.workspace, { recursive: true });
        // Also create memory directory as requested
        fs.mkdirSync(path.join(this.workspace, 'memory'), { recursive: true });
      } catch (e) {
        console.error("Failed to create workspace:", e);
      }
    }
  }

  private ensureBootstrapFiles() {
    // Default content for bootstrap files if they are missing
    const defaults: Record<string, string> = {
      "SOUL.md": `# Core Philosophy
You are a minimalist, high-efficiency AI agent.
- **Precision**: Do not waste tokens on pleasantries. Go straight to the solution.
- **Impact**: Focus on high-leverage changes.
- **Adaptability**: You are running in a dynamic environment; verify assumptions before acting.
- **Verification**: Never assume code works. Verify it.

# Tone
- Direct, professional, slightly dry.
- No emojis unless requested.
- No "I hope this helps".`,

      "USER.md": `# User Context
- **Role**: Developer / Architect
- **Goal**: Build a robust, self-improving AI agent framework (nano-x).
- **Preferences**:
    - TypeScript/Node.js for this project.
    - Prefer functional programming patterns where appropriate.
    - Hates spaghetti code.`,

      "AGENTS.md": `# Tool Usage Guidelines

## Editing Code
- **MUST use \`smart_edit\`**: When modifying code, you MUST use the \`smart_edit\` tool.
    - **Native Tool**: \`smart_edit\` is a native function, NOT a shell command.
    - **Context**: Provide a unique \`findText\` block with enough context (surrounding lines) to be unambiguous.
    - **Prohibition**: NEVER use \`fs_write_file\` to overwrite an entire file just to change a few lines.
    - **Common Error**: Do NOT try to run \`smart_edit\` via \`shell_execute_command\`.

## File Operations
- **Listing**: Use \`fs_ls\` to explore directories. (Filters out node_modules/.git by default).
- **Reading**: Use \`fs_read_file\` to read files.
    - **Prohibition**: DO NOT use \`type\`, \`cat\`, \`dir\` or pipes.
    - **Large Files**: For files > 500 lines, MUST specify \`startLine\` and \`endLine\`.
- **Writing**: Only use \`fs_write_file\` for CREATING new files or overwriting very small files.
- **Metadata**: Use \`get_file_metadata\` to check file size/stats. Do not guess.

## Shell Execution
- Use \`shell_execute_command\` for general system tasks (git, npm, mkdir, etc.) or when no specific tool is available.

## Sub-Agent Spawning
- You now have the ability to spawn sub-agents (Sub-agents) using the \`spawn_sub_agent\` tool.
- **When to use**: 
    - For complex, independent tasks like code analysis, large-scale refactoring, or security audits.
    - When you need to parallelize work or isolate a risky operation.
    - When a task requires a "fresh set of eyes" or a specific persona.
- **How to use**: Provide a clear, self-contained instruction. The sub-agent has its own context but shares the same filesystem.
- **Output**: The sub-agent will return a summary of its actions. You can then proceed based on its findings.

## Web Capabilities (DuckDuckGo)
- **Unlimited Access**: You have access to the internet via DuckDuckGo. No API keys are required, so use it freely.
- **Tools**:
    - \`web_search(query)\`: Search for information, documentation, or news. Returns top 5 results.
    - \`web_fetch(url)\`: Read the content of a specific webpage.
- **Strategy**: Use \`web_search\` to find URLs, then \`web_fetch\` to read details if the snippet is insufficient.

## Output Handling
- **Token Guard**: Output > 5000 characters will be truncated. Read large files in chunks.`,

      "IDENTITY.md": `# Identity
You are nano-x, an autonomous coding agent.`
    };

    for (const [filename, content] of Object.entries(defaults)) {
      const filePath = path.join(this.workspace, filename);
      if (!fs.existsSync(filePath)) {
        try {
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`[ContextBuilder] Created missing bootstrap file: ${filename}`);
        } catch (e) {
          console.error(`[ContextBuilder] Failed to create ${filename}:`, e);
        }
      }
    }
  }

  private getIdentity(): string {
    const now = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const platform = process.platform;
    const nodeVersion = process.version;
    const cwd = process.cwd();

    return `# nano-x 🤖

You are nano-x, a lightweight AI agent framework designed for efficiency and precision.

## Current Time
${now}

## Runtime
OS: ${platform}
Node: ${nodeVersion}
CWD: ${cwd}

## Workspace Status
Your home base is: ${this.workspace}
Your cognitive sandbox (memory/config) is strictly confined to this directory.
`;
  }

  private getPermissionConstraint(): string {
    // Using relative path './workspace/' for clarity in prompt as requested
    const constraint = `你目前的认知和记忆存储在 ./workspace/。除非用户明确指令，否则请优先在 workspace/ 内进行自我更新和记录。`;

    const recordInstinct = `
## Record Instinct (Dan Koe's Evolution)
你的大脑（上下文窗口）是昂贵且暂时的，但你的文字（存储）是廉价且永久的。
每当你学到关于用户的新偏好、解决了一个复杂的 Bug、或确立了一个架构决策，必须调用 \`remember\` 工具将其固化。`;

    const skillInstinct = `
## Skill Usage (Progressive Loading)
你是一个拥有海量技能库的 Agent，但为了节省资源，你当前只加载了与任务最相关的技能片段。
如果你发现现有的技能片段不足以完成任务，你可以查看 \`## Available Skills\` 清单，并引导用户提供更多关键词，或者直接使用 \`read_file\` 工具去阅读 \`workspace/skills/\` 下对应的详细文档。`;

    return constraint + recordInstinct + skillInstinct;
  }

  private loadBootstrapFiles(): string {
    const parts: string[] = [];
    const loadedFiles: string[] = [];

    for (const filename of this.BOOTSTRAP_FILES) {
      const filePath = path.join(this.workspace, filename);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          parts.push(`## ${filename}\n\n${content}`);
          loadedFiles.push(filename);
        } catch (error) {
          console.error(`Failed to read bootstrap file ${filename}:`, error);
        }
      }
    }

    if (loadedFiles.length > 0) {
      console.log(`[ContextBuilder] Loaded bootstrap files from workspace: ${loadedFiles.join(', ')}`);
    }

    return parts.join('\n\n');
  }
}
