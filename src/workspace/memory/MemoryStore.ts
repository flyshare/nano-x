import * as fs from 'fs';
import * as path from 'path';

export class MemoryStore {
    private workspace: string;
    private memoryDir: string;
    private dailyDir: string;
    private readonly MEMORY_FILE = "MEMORY.md";

    constructor(workspaceRoot: string) {
        // Workspace root is project root. The actual workspace is 'workspace/'
        this.workspace = path.join(workspaceRoot, 'workspace');
        this.memoryDir = path.join(this.workspace, 'memory');
        this.dailyDir = path.join(this.memoryDir, 'daily');
        this.ensureMemoryStructure();
    }

    private ensureMemoryStructure() {
        if (!fs.existsSync(this.memoryDir)) {
            fs.mkdirSync(this.memoryDir, { recursive: true });
        }
        if (!fs.existsSync(this.dailyDir)) {
            fs.mkdirSync(this.dailyDir, { recursive: true });
        }

        // Initialize Long-term Memory if not exists
        const longTermPath = path.join(this.memoryDir, this.MEMORY_FILE);
        if (!fs.existsSync(longTermPath)) {
            const userFile = path.join(this.workspace, 'USER.md');
            let userName = 'Developer';
            if (fs.existsSync(userFile)) {
                // Try to extract name, naive regex or just default
                // For now just use default or placeholder
            }

            const initialContent = `# Long-term Memory
- User: ${userName}
- Project: nano-x (The Self-Evolving Agent Framework)
- Philosophy: Musk-style minimalism, Dan Koe's Synthesis.
`;
            fs.writeFileSync(longTermPath, initialContent, 'utf-8');
            console.log(`[MemoryStore] Initialized ${this.MEMORY_FILE}`);
        }
    }

    public saveMemory(content: string, type: 'long' | 'daily'): string {
        try {
            if (type === 'long') {
                return this.saveLongTerm(content);
            } else {
                return this.saveDaily(content);
            }
        } catch (error) {
            return `Error saving memory: ${error}`;
        }
    }

    private saveLongTerm(content: string): string {
        const filePath = path.join(this.memoryDir, this.MEMORY_FILE);
        let existing = '';
        if (fs.existsSync(filePath)) {
            existing = fs.readFileSync(filePath, 'utf-8');
        } else {
            // Should have been initialized, but just in case
            existing = '';
        }

        // Simple duplicate check (very naive)
        if (existing.includes(content)) {
            return "Memory already exists (skipped duplicate).";
        }

        const entry = `\n- ${content.trim()}`;
        fs.appendFileSync(filePath, entry, 'utf-8');
        return "Long-term memory saved.";
    }

    private saveDaily(content: string): string {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filePath = path.join(this.dailyDir, `${today}.md`);

        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        const entry = `\n- [${timestamp}] ${content.trim()}`;

        fs.appendFileSync(filePath, entry, 'utf-8');
        return `Daily memory saved to ${today}.md`;
    }

    public getMemoryContext(): string {
        const parts: string[] = [];

        // 1. Long-term Memory
        const longTermPath = path.join(this.memoryDir, this.MEMORY_FILE);
        if (fs.existsSync(longTermPath)) {
            const content = fs.readFileSync(longTermPath, 'utf-8');
            parts.push(`### Long-term Memory\n${content}`);
        }

        // 2. Daily Memory (Today)
        const today = new Date().toISOString().split('T')[0];
        const dailyPath = path.join(this.dailyDir, `${today}.md`);
        if (fs.existsSync(dailyPath)) {
            const content = fs.readFileSync(dailyPath, 'utf-8');
            parts.push(`### Daily Memory (${today})\n${content}`);
        }

        return parts.join('\n\n');
    }
}
