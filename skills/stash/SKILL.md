---
name: engram:stash
description: Park current conversation thread for later
user_invocable: true
arguments:
  - name: label
    description: Optional label for the stash
    required: false
---

# /stash [label]

Park the current conversation thread so it can be resumed later.

## Behavior

1. Call `memory_stash` to get the current stash state
2. The current active conversation will be stashed with the provided label (or auto-generated one)
3. Inform the user that the conversation has been stashed and can be resumed with `/resume`
4. Show the conversation ID for reference

## When to Use

- Switching context to a different task mid-session
- Pausing work that you want to pick up later
- Creating a save point before exploring a different approach

## Examples

- `/stash auth refactor` → stashes current thread with label "auth refactor"
- `/stash` → stashes with auto-generated label based on the conversation topic
