# Engram

**Persistent memory for Claude Code.** Automatic observation capture, knowledge management, hybrid search, conversation stashing, and a knowledge graph — all running as a native Claude Code plugin.

Claude Code forgets everything when a session ends. Engram fixes that.

---

## What it does

Every tool call Claude makes (file reads, edits, bash commands, web searches) is automatically captured as an **observation**. These observations are searchable, organized by session and conversation, and persist across sessions forever.

On top of that, you can explicitly save **knowledge** — decisions, preferences, patterns, issues — that Claude can retrieve in future sessions to maintain context about your projects.

```
You: /remember  Always use pnpm in this project, not npm
Engram: Saved as preference, tagged [tooling, package-manager]

--- 3 weeks later, new session ---

Claude: [Engram Memory] Preference: Always use pnpm in this project, not npm
```

## Features

**Automatic capture** — PostToolUse hooks record every meaningful action without you doing anything. Session start injects relevant context from previous sessions.

**9 MCP tools** for Claude to use directly:

| Tool | Purpose |
|---|---|
| `memory_search` | Hybrid FTS5 + vector semantic search across all memory |
| `memory_save` | Store knowledge (facts, decisions, preferences, patterns) |
| `memory_timeline` | Chronological view of observations and activity |
| `memory_get` | Fetch full details for specific memory IDs |
| `memory_forget` | Delete memories by ID, query, or date range |
| `memory_stash` | List stashed (paused) conversation threads |
| `memory_resume` | Resume a stashed conversation with full context |
| `memory_stats` | Usage analytics and storage info |
| `memory_resolve` | Resolve conflicts when new memories overlap existing ones |

**7 slash commands** for you:

`/remember` `/forget` `/recall` `/stash` `/resume` `/checkpoint` `/resolve`

**Knowledge graph** — Knowledge items are connected by typed edges (derives_from, supports, contradicts, refines, supersedes). A discovery engine finds implicit connections across your knowledge base.

**Topic shift detection** — Adaptive heuristics detect when you've changed topics mid-session and suggest stashing the previous conversation thread so you can resume it later.

**Conflict detection** — When a new observation is near-duplicate of existing memory, Engram flags it for resolution instead of blindly saving duplicates.

**Session-aware concurrency** — Multiple Claude sessions can run simultaneously against the same database. Each session is identified by its Claude session ID, not by guessing, so observations never cross-contaminate.

**Crash recovery** — A write-ahead journal ensures no observations are lost if a session crashes mid-write.

**Web UI** — Dashboard, search, timeline, knowledge browser, and graph explorer at `http://127.0.0.1:37820`.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Claude Code CLI                         │
├──────────┬──────────┬────────────────────┬───────────────────┤
│  Hooks   │   MCP    │  Observation Buffer │  System Prompt   │
│  (6)     │  Tools   │  + Curation Agent   │  Context Builder │
│          │  (9)     │                     │                  │
├──────────┴──────────┴────────────────────┴───────────────────┤
│  Knowledge Graph  │  Conflict Detection  │  Topic Shift Det. │
├───────────────────┴──────────────────────┴───────────────────┤
│  SQLite + WAL  │  FTS5 (4 indexes)  │  sqlite-vec (384-dim) │
├──────────────────────────────────────────────────────────────┤
│                    Web UI  :37820                             │
└──────────────────────────────────────────────────────────────┘
```

**Hooks lifecycle:**

1. **SessionStart** — Detects project, creates session, injects context from previous sessions
2. **UserPromptSubmit** — Runs topic shift detection, surfaces memory conflicts
3. **PostToolUse** — Captures observations from Read/Edit/Write/Bash/Grep/Glob/WebFetch/WebSearch
4. **PreToolUse** — Auto-checkpoints before destructive bash commands
5. **PreCompact** — Saves a compaction snapshot before context window compression
6. **SessionEnd** — Summarizes session, stashes active conversations, flushes embedding queue

## Setup

```bash
git clone https://github.com/NoobyNull/Engram.git
```

Then start Claude Code inside the cloned directory. Engram ships pre-built — the Setup hook will automatically install native dependencies on first launch.

For development (modifying Engram source):

```bash
cd Engram
npm install
node setup.js
```

The database lives at `~/.engram/engram.db`. Override with `ENGRAM_DATA_DIR` env var.

## Uninstall

```bash
./teardown.sh           # Remove plugin registration + build artifacts
./teardown.sh --purge   # Also delete ~/.engram (database + all saved memories)
```

## Requirements

- Node.js >= 20
- Claude Code CLI
- SQLite3 (bundled via better-sqlite3)

## Tech stack

- **TypeScript** — strict mode, ES modules
- **better-sqlite3** — WAL mode, FTS5, concurrent-safe
- **sqlite-vec** — 384-dimensional vector embeddings for semantic search
- **@modelcontextprotocol/sdk** — MCP stdio server
- **fastembed** — local embedding generation (BGE Small EN v1.5)

## Configuration

Settings are stored in `~/.engram/settings.json`. Defaults:

```json
{
  "maxContextTokens": 2000,
  "sessionHistoryDepth": 10,
  "autoCapture": true,
  "webUI": { "enabled": true, "port": 37820 },
  "embeddings": { "enabled": true, "provider": "fastembed", "model": "BGESmallENV15" },
  "search": { "ftsWeight": 0.4, "vectorWeight": 0.4, "recencyWeight": 0.1, "projectAffinityWeight": 0.1 },
  "curation": { "enabled": true, "minObservations": 5 },
  "conflictDetection": { "enabled": true, "similarityThreshold": 0.65 },
  "knowledgeGraph": { "enabled": true, "maxDepth": 5, "discoveryEnabled": true }
}
```

## License

MIT
