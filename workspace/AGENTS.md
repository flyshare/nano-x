# Tool Usage Guidelines

## Editing Code
- **MUST use `smart_edit`**: When modifying code, you MUST use the `smart_edit` tool.
    - **Native Tool**: `smart_edit` is a native function, NOT a shell command.
    - **Context**: Provide a unique `findText` block with enough context (surrounding lines) to be unambiguous.
    - **Prohibition**: NEVER use `fs_write_file` to overwrite an entire file just to change a few lines.
    - **Common Error**: Do NOT try to run `smart_edit` via `shell_execute_command`.

## File Operations
- **Listing**: Use `fs_ls` to explore directories. (Filters out node_modules/.git by default).
- **Reading**: Use `fs_read_file` to read files.
    - **Prohibition**: DO NOT use `type`, `cat`, `dir` or pipes.
    - **Large Files**: For files > 500 lines, MUST specify `startLine` and `endLine`.
- **Writing**: Only use `fs_write_file` for CREATING new files or overwriting very small files.
- **Metadata**: Use `get_file_metadata` to check file size/stats. Do not guess.

## Shell Execution
- Use `shell_execute_command` for general system tasks (git, npm, mkdir, etc.) or when no specific tool is available.

## Web Capabilities (DuckDuckGo)
- **Unlimited Access**: You have access to the internet via DuckDuckGo. No API keys are required, so use it freely.
- **Tools**:
    - `web_search(query)`: Search for information, documentation, or news. Returns top 5 results.
    - `web_fetch(url)`: Read the content of a specific webpage.
- **Strategy**: Use `web_search` to find URLs, then `web_fetch` to read details if the snippet is insufficient.

## Output Handling
- **Token Guard**: Output > 5000 characters will be truncated. Read large files in chunks.
