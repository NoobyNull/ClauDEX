---
name: engram:remember
description: Save something to persistent memory
user_invocable: true
arguments:
  - name: content
    description: What to remember
    required: true
---

# /remember [content]

Save a piece of knowledge to Engram persistent memory.

## Behavior

1. Parse the content provided by the user
2. Infer the knowledge type from the content:
   - **fact** — objective information about the codebase, architecture, or environment
   - **decision** — a choice that was made (e.g., "we chose PostgreSQL over MySQL")
   - **preference** — user or project preference (e.g., "use single quotes in TypeScript")
   - **pattern** — recurring approach or convention (e.g., "all API endpoints return {data, error}")
   - **issue** — known bug, limitation, or gotcha
   - **context** — background information that helps understand the project
3. Suggest relevant tags based on the content (e.g., file paths, technology names, feature areas)
4. Call the `memory_save` MCP tool with:
   - `content`: the knowledge to save
   - `type`: the inferred type
   - `tags`: suggested tags
   - `project`: current project path if relevant
5. Confirm to the user what was saved and with what type/tags

## Examples

- `/remember We use Vitest for testing, not Jest` → saves as **preference** with tags `[testing, vitest]`
- `/remember The auth service rate limits to 100 req/min` → saves as **fact** with tags `[auth, rate-limit]`
- `/remember Decided to use SQLite instead of PostgreSQL for simplicity` → saves as **decision** with tags `[database, sqlite]`
