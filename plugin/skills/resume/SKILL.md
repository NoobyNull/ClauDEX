---
name: engram:resume
description: Resume a stashed conversation or list stashes
user_invocable: true
arguments:
  - name: target
    description: "list, search <query>, or topic to resume"
    required: false
---

# /resume [target]

Resume a stashed conversation thread or browse available stashes.

## Behavior

### `/resume list`
1. Call `memory_stash` to get all stashed conversations
2. Display them grouped by stash group (if any), showing:
   - Conversation topic
   - When it was stashed
   - Number of observations
   - Session it belongs to
3. Prompt the user to pick one to resume

### `/resume search <query>`
1. Call `memory_search` with the query, filtered to conversations
2. Show matching stashed conversations
3. Prompt the user to pick one to resume

### `/resume <topic>`
1. Call `memory_search` with the topic
2. Find the best matching stashed conversation
3. Call `memory_resume` with the conversation ID
4. Present the resumed context (topic, summary, observation count)
5. If natively resumable, mention the `claude --resume` command

### `/resume` (bare)
1. Call `memory_stash` to list all stashed conversations
2. If only one exists, resume it automatically
3. If multiple exist, show an interactive picker:
   - Number each stash
   - Show topic, age, and observation count
   - Ask the user to pick one by number or topic keyword
4. Resume the selected conversation

## Examples

- `/resume list` → shows all stashed conversations
- `/resume search auth` → finds stashed conversations about authentication
- `/resume API refactoring` → directly resumes the best-matching stash
- `/resume` → interactive picker if multiple stashes exist
