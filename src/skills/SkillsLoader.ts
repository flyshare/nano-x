
import * as fs from 'fs';
import * as path from 'path';

export interface SkillMetadata {
    name: string;
    description: string;
    keywords: string[];
}

export interface Skill {
    metadata: SkillMetadata;
    content: string;
    path: string;
}

export class SkillsLoader {
    private skillsDir: string;
    private skills: Map<string, Skill> = new Map();

    constructor(workspaceRoot: string) {
        this.skillsDir = path.join(workspaceRoot, 'workspace', 'skills');
        this.ensureSkillsDir();
    }

    private ensureSkillsDir() {
        if (!fs.existsSync(this.skillsDir)) {
            try {
                fs.mkdirSync(this.skillsDir, { recursive: true });
                // Auto-generate example skill if requested, handled by caller or here?
                // The task says "If workspace/skills/ is empty, please automatically create a code_reviewer skill folder."
                // I'll leave the auto-creation logic to the caller (ContextBuilder) or handle it here if empty.
                // Let's handle it here to be self-contained.
                this.createDefaultSkill();
            } catch (e) {
                console.error("Failed to create skills directory:", e);
            }
        } else {
            // Check if empty
            const files = fs.readdirSync(this.skillsDir);
            if (files.length === 0) {
                this.createDefaultSkill();
            }
        }
    }

    private createDefaultSkill() {
        const skillPath = path.join(this.skillsDir, 'code_reviewer');
        if (!fs.existsSync(skillPath)) {
            fs.mkdirSync(skillPath, { recursive: true });
            const content = `---
Name: Code Reviewer
Description: Expert code analysis for security, performance, and maintainability.
Keywords: [review, audit, security, refactor, code quality, 审计, 审查]
---

# Code Review Standard

## 1. Security
- **Injection**: Check for SQLi, XSS, Command Injection.
- **Secrets**: Ensure no hardcoded secrets/API keys.
- **Input Validation**: Validate all external inputs.

## 2. Performance
- **Loops**: Avoid O(n^2) or worse inside critical paths.
- **IO**: Async I/O for file/network operations.
- **Memory**: Check for memory leaks (unclosed listeners, large objects).

## 3. Maintainability
- **Naming**: Variables should be descriptive (e.g., \`userAge\` vs \`x\`).
- **Functions**: Single responsibility principle. < 50 lines preferred.
- **Types**: No \`any\` in TypeScript unless absolutely necessary.

## 4. Workflow
1. Read the code file(s).
2. Identify issues based on the checklist above.
3. Provide a summary of Critical, High, and Medium issues.
4. Suggest specific code fixes using \`diff\` format.`;
            fs.writeFileSync(path.join(skillPath, 'SKILL.md'), content, 'utf-8');
            console.log("[SkillsLoader] Created default skill: code_reviewer");
        }
    }

    public scanSkills() {
        this.skills.clear();
        if (!fs.existsSync(this.skillsDir)) return;

        const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const skillFile = path.join(this.skillsDir, entry.name, 'SKILL.md');
                if (fs.existsSync(skillFile)) {
                    this.loadSkill(skillFile, entry.name);
                }
            }
        }
        console.log(`[SkillsLoader] Loaded ${this.skills.size} skills.`);
    }

    private loadSkill(filePath: string, dirName: string) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const metadata = this.parseMetadata(content);
            if (metadata) {
                this.skills.set(dirName, {
                    metadata,
                    content,
                    path: filePath
                });
            }
        } catch (e) {
            console.error(`[SkillsLoader] Failed to load skill from ${filePath}:`, e);
        }
    }

    private parseMetadata(content: string): SkillMetadata | null {
        // Simple regex parser for YAML frontmatter
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) return null;

        const yamlBlock = match[1];
        const nameMatch = yamlBlock.match(/Name:\s*(.+)/);
        const descMatch = yamlBlock.match(/Description:\s*(.+)/);
        const keywordsMatch = yamlBlock.match(/Keywords:\s*\[(.*?)\]/);

        if (nameMatch && descMatch && keywordsMatch) {
            const keywords = keywordsMatch[1].split(',').map(k => k.trim().toLowerCase());
            return {
                name: nameMatch[1].trim(),
                description: descMatch[1].trim(),
                keywords
            };
        }
        return null;
    }

    public getSkillsSummary(): string {
        if (this.skills.size === 0) return "No skills available.";
        
        const summary: string[] = [];
        for (const skill of this.skills.values()) {
            summary.push(`- **${skill.metadata.name}**: ${skill.metadata.description} (Keywords: ${skill.metadata.keywords.slice(0, 3).join(', ')}...)`);
        }
        return summary.join('\n');
    }

    public matchSkills(userInput: string): string | null {
        if (!userInput) return null;
        
        const normalizedInput = userInput.toLowerCase();
        const matchedSkills: string[] = [];

        for (const skill of this.skills.values()) {
            // Check if any keyword is present in user input
            const isMatch = skill.metadata.keywords.some(keyword => normalizedInput.includes(keyword));
            if (isMatch) {
                matchedSkills.push(`## Skill: ${skill.metadata.name}\n${skill.content}`);
            }
        }

        if (matchedSkills.length === 0) return null;
        return matchedSkills.join('\n\n---\n\n');
    }
}
