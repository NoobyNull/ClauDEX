---
name: engram:resolve
description: Resolve a memory conflict or review pending conflicts
user_invocable: true
arguments:
  - name: action
    description: "Optional: merge, keep_both, replace, skip, or list"
    required: false
---

# /resolve [action]

Handle memory conflicts — when Engram detects that a new observation looks similar to something already stored.

## Behavior

### `/resolve` or `/resolve list`
1. Check the observation buffer for items with `needs_clarification` status
2. For each unresolved conflict, show:
   - The new observation (tool, summary, timestamp)
   - The existing memory it matches (type, snippet, similarity %)
   - Available actions
3. Ask the user to pick an action for each conflict

### When Engram surfaces a conflict automatically
Engram will inject a prompt when it detects a near-duplicate. Present the user with these options:

1. **Same thing** (`merge`) — Combine the new observation into the existing memory. The old memory gets updated with new info, the duplicate observation is removed.
2. **Completely new** (`keep_both`) — Keep both as separate memories. They may look similar but represent different things.
3. **Replace old** (`replace`) — The new information supersedes the old. Update the existing memory with the new content.
4. **Don't save** (`skip`) — Discard the new observation entirely. Don't add it to memory.

After the user chooses, call `memory_resolve` with:
- `conflict_id`: the new observation ID
- `existing_id`: the existing memory ID
- `action`: the chosen action (merge, keep_both, replace, skip)

## Examples

- User picks "Same thing" → call `memory_resolve` with action `merge`
- User picks "Completely new" → call `memory_resolve` with action `keep_both`
- User picks "Don't save" → call `memory_resolve` with action `skip`

## Notes

- Conflicts are detected automatically by comparing new observations against existing memories using hybrid search
- The similarity threshold is configurable in settings (default: 65%)
- Exact duplicates (>95% similar) are silently skipped without prompting
- Only one conflict is surfaced at a time to avoid overwhelming the user
