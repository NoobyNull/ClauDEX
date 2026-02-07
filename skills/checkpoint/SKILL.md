---
name: engram:checkpoint
description: Create a session save point
user_invocable: true
arguments:
  - name: label
    description: Optional label for the checkpoint
    required: false
---

# /checkpoint [label]

Create a save point (fork) for the current session.

## Behavior

1. Create a checkpoint of the current session state, capturing:
   - Current observation count
   - Active conversation IDs
   - Last observation reference
2. Store it in the `session_forks` table with the provided label
3. Confirm to the user:
   - Checkpoint ID
   - Session it belongs to
   - Label (if provided)
   - Timestamp

## When to Use

- Before making risky changes (destructive bash commands, major refactors)
- As a manual save point to mark a known-good state
- Before exploring an experimental approach

## Automatic Checkpoints

Engram also creates checkpoints automatically before destructive Bash operations (like `rm -rf`, `git reset --hard`, etc.) when the `checkpoints.autoForkBeforeDestructive` config option is enabled.

## Examples

- `/checkpoint before migration` → creates a labeled checkpoint
- `/checkpoint` → creates an unlabeled checkpoint with timestamp
