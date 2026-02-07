---
name: claudex:status
description: Show ClauDEX system health, build info, and service status
user_invocable: true
arguments: []
---

# /claudex:status

Display a comprehensive status dashboard for the ClauDEX plugin.

## Behavior

1. Call the `memory_stats` MCP tool to get memory statistics
2. Gather system information from the environment
3. Present a formatted status report covering all sections below

## Output Format

Present the status as a clean, structured report with these sections:

### System

| Field | How to get it |
|-------|---------------|
| ClauDEX version | From `memory_stats` response or read `~/.claudex/` install marker |
| Node.js version | `process.version` (mention in output) |
| Platform | `process.platform` / `process.arch` |
| Data directory | `~/.claudex/` |
| Database path | `~/.claudex/claudex.db` |
| Database size | From `memory_stats` → `storageBytes` (format as KB/MB) |
| Schema version | 4 (current) |
| Log file | `~/.claudex/claudex.log` |

### Services

| Service | How to check |
|---------|-------------|
| MCP Server | If `memory_stats` call succeeds → running. If it fails → not running. |
| Web UI | Try `curl -s http://127.0.0.1:37820/` or note from config `webUI.port`. Report as "enabled on port X" or "disabled". |
| Hooks | List the 7 registered hooks: Setup, SessionStart, UserPromptSubmit, PostToolUse, PreToolUse, PreCompact, SessionEnd |

### Dependencies

| Package | Status |
|---------|--------|
| better-sqlite3 | Required. If MCP responds → installed. |
| sqlite-vec | Optional. Check if `memory_stats` returns embeddings > 0 or note from stats. |
| fastembed | Optional. Check if embeddings are being generated. |

### Memory Stats

From `memory_stats` response, display:

- Observations count
- Knowledge entries count
- Sessions count
- Conversations (total / stashed)
- Projects count
- Embeddings (stored / pending)
- Top tags (if any)

### Configuration Highlights

Summarize key config states:
- Auto-capture: enabled/disabled
- Embeddings: provider + model + enabled/disabled
- Vector search: available/unavailable
- Conflict detection: enabled/disabled (threshold %)
- Checkpoints: enabled/disabled, auto-fork on/off
- Knowledge graph: enabled/disabled
- Curation: enabled/disabled

## Formatting

- Use a monospace-friendly table layout
- Use checkmarks/crosses for boolean states
- Format byte sizes human-readably (e.g., "2.4 MB")
- Keep the output concise — one screen if possible

## Example Output

```
ClauDEX Status
==============

System
  Version:      1.0.0
  Node.js:      v22.1.0
  Platform:     linux/x64
  Data dir:     ~/.claudex/
  Database:     ~/.claudex/claudex.db (2.4 MB)
  Log file:     ~/.claudex/claudex.log

Services
  MCP Server:   running
  Web UI:       enabled on :37820
  Hooks:        7 registered (Setup, SessionStart, UserPromptSubmit, PostToolUse, PreToolUse, PreCompact, SessionEnd)

Dependencies
  better-sqlite3:  installed
  sqlite-vec:      installed (vector search enabled)
  fastembed:       installed (local embeddings enabled)

Memory
  Observations:    142
  Knowledge:       23
  Sessions:        18
  Conversations:   12 (3 stashed)
  Projects:        2
  Embeddings:      165 stored, 0 pending
  Top tags:        typescript(45), auth(23), api(19), database(12), testing(8)

Config
  Auto-capture:       on
  Embeddings:         fastembed / BGESmallENV15
  Vector search:      available
  Conflict detection: on (65% threshold)
  Checkpoints:        on (auto-fork: on)
  Knowledge graph:    on
  Curation:           on
```

## Error Handling

- If `memory_stats` fails (MCP not running), report what you can from the filesystem:
  - Check if `~/.claudex/` exists
  - Check if `claudex.db` exists and its size
  - Check if settings.json exists
  - Report MCP server as "not running" and suggest the user check plugin installation
