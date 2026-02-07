---
name: engram:forget
description: Delete something from persistent memory
user_invocable: true
arguments:
  - name: what
    description: What to forget (search query or ID)
    required: true
---

# /forget [what]

Delete memories from Engram persistent storage.

## Behavior

1. First, search for matching memories using `memory_search` with the user's query
2. Present the search results to the user, showing:
   - ID, type, snippet, and timestamp for each match
   - Number of results found
3. Ask the user to confirm which items to delete:
   - If only 1 result: confirm deletion of that specific item
   - If multiple results: ask which ones to delete (all, specific IDs, or cancel)
4. Call `memory_forget` with the confirmed IDs
5. Report what was deleted

## Important

- **Always search first** — never delete without showing the user what will be removed
- **Always confirm** — deletion is permanent and cannot be undone
- If the user provides a specific ID (e.g., `obs_abc123`), you can skip the search step but still confirm

## Examples

- `/forget SQLite migration` → searches, shows matches, confirms, then deletes
- `/forget obs_abc123` → confirms deletion of specific observation, then deletes
- `/forget everything before January` → uses `memory_forget` with `before_date` parameter
