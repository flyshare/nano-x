---
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
- **Naming**: Variables should be descriptive (e.g., `userAge` vs `x`).
- **Functions**: Single responsibility principle. < 50 lines preferred.
- **Types**: No `any` in TypeScript unless absolutely necessary.

## 4. Workflow
1. Read the code file(s).
2. Identify issues based on the checklist above.
3. Provide a summary of Critical, High, and Medium issues.
4. Suggest specific code fixes using `diff` format.
