# Engram — Complete Capabilities Reference

> **Persistent Memory for Claude Code** — SDK-native plugin that gives Claude long-term memory across sessions, projects, and conversations.

```
  Version   2.0.0          Schema   v4
  License   Private        Port     37820
  Engine    SQLite + WAL   Vectors  384-dim (BGE Small EN v1.5)
```

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [MCP Tools](#mcp-tools)
  - [memory_search](#memory_search)
  - [memory_save](#memory_save)
  - [memory_timeline](#memory_timeline)
  - [memory_get](#memory_get)
  - [memory_forget](#memory_forget)
  - [memory_stash](#memory_stash)
  - [memory_resume](#memory_resume)
  - [memory_stats](#memory_stats)
  - [memory_resolve](#memory_resolve)
- [Skills (Slash Commands)](#skills-slash-commands)
  - [/remember](#remember)
  - [/forget](#forget)
  - [/recall](#recall)
  - [/stash](#stash)
  - [/resume](#resume)
  - [/checkpoint](#checkpoint)
  - [/resolve](#resolve)
- [SDK Hooks](#sdk-hooks)
  - [SessionStart](#sessionstart)
  - [UserPromptSubmit](#userpromptsubmit)
  - [PostToolUse](#posttooluse)
  - [PreToolUse](#pretooluse)
  - [PreCompact](#precompact)
  - [SessionEnd](#sessionend)
- [Knowledge Graph](#knowledge-graph)
  - [Knowledge Types](#knowledge-types)
  - [Edge Relationships](#edge-relationships)
  - [Graph Traversal](#graph-traversal)
  - [Discovery Engine](#discovery-engine)
- [Conflict Detection](#conflict-detection)
- [Curation Agent](#curation-agent)
- [Observation Buffer](#observation-buffer)
- [Checkpoint System](#checkpoint-system)
- [Search Engine](#search-engine)
  - [Hybrid Search](#hybrid-search)
  - [Full-Text Search (FTS5)](#full-text-search-fts5)
  - [Vector Search](#vector-search)
  - [Scoring Weights](#scoring-weights)
- [Embedding Pipeline](#embedding-pipeline)
- [Topic Shift Detection](#topic-shift-detection)
- [Project Detection](#project-detection)
- [Summarization](#summarization)
- [Recovery Journal](#recovery-journal)
- [Web UI](#web-ui)
  - [Dashboard](#dashboard)
  - [Search View](#search-view)
  - [Timeline View](#timeline-view)
  - [Knowledge View](#knowledge-view)
  - [Graph Explorer](#graph-explorer)
  - [Settings](#settings)
- [REST API](#rest-api)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Plugin Integration](#plugin-integration)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code SDK                          │
│                                                                 │
│  initEngram(cwd) → { mcpServers, hooks, systemPrompt }        │
│                                                                 │
├──────────┬──────────┬───────────────────────┬───────────────────┤
│  Hooks   │   MCP    │   Observation Buffer  │  System Prompt    │
│  (6)     │  Tools   │   + Curation Agent    │  Context Builder  │
│          │  (9)     │                       │                   │
├──────────┴──────────┴───────────────────────┴───────────────────┤
│                                                                 │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Knowledge │  │   Conflict   │  │   Topic Shift Detection  │  │
│  │   Graph   │  │  Detection   │  │   + Adaptive Thresholds  │  │
│  │ + Disco-  │  │  + Resolve   │  │                          │  │
│  │   very    │  │              │  │                          │  │
│  └─────┬─────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│        │               │                       │                │
├────────┴───────────────┴───────────────────────┴────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  SQLite  │  │   FTS5 (4    │  │ sqlite-vec│  │ Recovery  │  │
│  │  + WAL   │  │   indexes)   │  │ 384-dim   │  │  Journal  │  │
│  └──────────┘  └──────────────┘  └───────────┘  └───────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     Web UI  :37820                               │
│  Dashboard │ Search │ Timeline │ Knowledge │ Graph │ Settings   │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for a single tool use:**

```
PostToolUse hook fires
        │
        ▼
┌─ Observation created ─┐
│  (tool, summary,      │
│   files, tags)        │
└───────┬───────────────┘
        │
        ├──▶ Observation Buffer (staging)
        │         │
        │         ├──▶ Conflict Detection (async)
        │         │         │
        │         │         └──▶ if similar → flag as needs_clarification
        │         │                    │
        │         │                    └──▶ UserPromptSubmit surfaces conflict
        │         │
        │         └──▶ Session End → Curation Agent
        │                                │
        │                                ├──▶ keep / discard / merge
        │                                └──▶ extract knowledge
        │
        ├──▶ Embedding Queue
        │         │
        │         └──▶ Session End → processQueue() → vec_embeddings
        │
        └──▶ FTS5 triggers (automatic index update)
```

---

## MCP Tools

Nine in-process MCP tools accessible to Claude during any session.

### memory_search

> Search persistent memory using hybrid FTS5 keyword + vector semantic search.

| Parameter   | Type     | Required | Default | Description                          |
|-------------|----------|----------|---------|--------------------------------------|
| `query`     | string   | **yes**  | —       | Keywords, file names, concepts, or natural language |
| `type`      | enum     | no       | `all`   | `all` · `observations` · `knowledge` · `sessions` · `conversations` |
| `project`   | string   | no       | —       | Filter by project path               |
| `tags`      | string[] | no       | —       | Filter by tags                       |
| `from_date` | string   | no       | —       | Start date (ISO 8601)                |
| `to_date`   | string   | no       | —       | End date (ISO 8601)                  |
| `limit`     | number   | no       | `20`    | Max results                          |

**Returns:** Array of [SearchResult](#database-schema) with `id`, `type`, `snippet`, `score`, `timestamp`, `project_path`, `tags`, `metadata`.

---

### memory_save

> Explicitly save a piece of knowledge — stored permanently and searchable.

| Parameter              | Type     | Required | Default | Description                                |
|------------------------|----------|----------|---------|--------------------------------------------|
| `content`              | string   | **yes**  | —       | The knowledge to save                      |
| `type`                 | enum     | **yes**  | —       | `fact` · `decision` · `preference` · `pattern` · `issue` · `context` · `discovery` |
| `tags`                 | string[] | no       | `[]`    | Tags for categorization                    |
| `project`              | string   | no       | —       | Associated project path                    |
| `source_knowledge_ids` | string[] | no       | `[]`    | Knowledge IDs this derives from (for discoveries) |

**Side effects:**
1. Queued for embedding generation
2. [Discovery engine](#discovery-engine) fires asynchronously — creates graph edges and may derive new discoveries

---

### memory_timeline

> View chronological observations and activity.

| Parameter         | Type   | Required | Default | Description               |
|-------------------|--------|----------|---------|---------------------------|
| `around`          | string | no       | —       | Center on ISO 8601 date   |
| `session_id`      | string | no       | —       | Filter by session         |
| `conversation_id` | string | no       | —       | Filter by conversation    |
| `project`         | string | no       | —       | Filter by project path    |
| `limit`           | number | no       | `20`    | Max results               |

---

### memory_get

> Fetch full details for specific memory IDs.

| Parameter         | Type     | Required | Default | Description                           |
|-------------------|----------|----------|---------|---------------------------------------|
| `ids`             | string[] | **yes**  | —       | IDs to fetch (any type)               |
| `include_context` | boolean  | no       | `false` | Include surrounding session context   |
| `include_graph`   | boolean  | no       | `false` | Include knowledge graph edges and reasoning chains |

**ID Prefixes:**
- `obs_` — Observation
- `kn_` — Knowledge
- `ses_` — Session
- `conv_` — Conversation
- `fork_` — Checkpoint (via `memory_resume`)

When `include_graph` is `true` for knowledge items, the response includes:
- `edges[]` — All graph edges for the node
- `reasoning_chain[]` — Full derivation chain (for `discovery` type only)
- `chain_depth_limited` — Whether the traversal hit the max depth

---

### memory_forget

> Delete memories for privacy.

| Parameter     | Type     | Required | Default | Description                          |
|---------------|----------|----------|---------|--------------------------------------|
| `ids`         | string[] | no       | —       | Specific IDs to delete               |
| `query`       | string   | no       | —       | Delete memories matching search      |
| `before_date` | string   | no       | —       | Delete memories before ISO 8601 date |

At least one parameter must be provided.

---

### memory_stash

> List stashed sidebar conversations — paused threads that can be resumed.

| Parameter | Type    | Required | Default | Description              |
|-----------|---------|----------|---------|--------------------------|
| `list`    | boolean | no       | `true`  | List all stashed sidebars |
| `group`   | string  | no       | —       | Filter by stash group ID |
| `project` | string  | no       | —       | Filter by project path   |

---

### memory_resume

> Resume a stashed sidebar conversation.

| Parameter         | Type   | Required | Default | Description              |
|-------------------|--------|----------|---------|--------------------------|
| `conversation_id` | string | **yes**  | —       | Conversation or fork ID  |

**Returns:** Context for injection and, if available, the Claude CLI session ID for native resume. Supports checkpoint-based resume for `fork_` prefixed IDs.

---

### memory_stats

> Get usage analytics.

| Parameter | Type   | Required | Default | Description            |
|-----------|--------|----------|---------|------------------------|
| `project` | string | no       | —       | Filter stats by project |

**Returns:** `observations`, `knowledge`, `sessions`, `conversations`, `stashed`, `projects`, `embeddings`, `pendingEmbeddings`, `storageBytes`, `topTags[]`.

---

### memory_resolve

> Resolve a memory conflict when a new observation is similar to an existing memory.

| Parameter     | Type   | Required | Default | Description                                  |
|---------------|--------|----------|---------|----------------------------------------------|
| `conflict_id` | string | **yes**  | —       | Observation ID of the conflicting new memory |
| `existing_id` | string | no       | —       | ID of the existing memory it conflicts with  |
| `action`      | enum   | **yes**  | —       | `merge` · `keep_both` · `replace` · `skip`   |

**Actions:**

| Action      | Behavior                                                |
|-------------|---------------------------------------------------------|
| `merge`     | Combine new observation into existing memory, delete dup |
| `keep_both` | Keep both as separate memories                          |
| `replace`   | Update existing memory with new content, delete one     |
| `skip`      | Discard the new observation entirely                    |

---

## Skills (Slash Commands)

Seven user-invocable slash commands. Type in the Claude Code prompt to activate.

### /remember

```
/remember <content>
```

Save something to persistent memory. Infers the knowledge type (fact, decision, preference, pattern, issue, context), suggests relevant tags, calls `memory_save`.

### /forget

```
/forget <what>
```

Delete something from memory. Searches first, shows matching results, confirms with the user, then deletes via `memory_forget`.

### /recall

```
/recall <query>
```

Conversational search across all memory types. Calls `memory_search`, presents results grouped by type, offers to fetch deeper detail on any result.

### /stash

```
/stash [label]
```

Park the current conversation thread for later. Assigns an optional label or auto-generates one from the conversation topic.

### /resume

```
/resume                  ← Interactive stash picker
/resume list             ← List all stashed conversations
/resume search <query>   ← Fuzzy-find stashes
/resume <topic>          ← Direct match + resume
```

Resume a previously stashed conversation. Returns context and, if available, the Claude CLI session ID for native resume.

### /checkpoint

```
/checkpoint [label]
```

Create a session save point. Captures observation count, conversation IDs, and last observation reference. Can be resumed later.

### /resolve

```
/resolve                 ← List pending conflicts
/resolve list            ← Same as bare /resolve
/resolve merge           ← Resolve with merge
/resolve keep_both       ← Keep both memories
/resolve replace         ← Replace old with new
/resolve skip            ← Discard the new memory
```

Handle memory conflicts — when Engram detects that a new observation is similar to something already stored.

---

## SDK Hooks

Six hook callbacks registered with the Claude Code SDK. All run in-process (no shell spawning).

### SessionStart

```
Trigger:   Session startup or resume
Matcher:   startup|resume
Blocking:  Yes
Returns:   { additionalContext: string }
```

1. Initializes database connection
2. Replays recovery journal (if pending entries exist)
3. Detects project from working directory
4. Creates or finds existing session
5. Builds system prompt context (recent knowledge, session history, project info)
6. Returns context for injection into the session

### UserPromptSubmit

```
Trigger:   Before each user prompt is processed
Blocking:  Yes
Returns:   { additionalContext?: string }
```

1. Checks observation buffer for unresolved memory conflicts
   - If found, injects a prompt asking the user to resolve (one at a time)
2. Runs topic shift detection with three-tier scoring
   - **ignore** (score < 0.4): same topic, do nothing
   - **ask** (0.4 ≤ score < 0.85): suggest stashing current conversation
   - **trust** (score ≥ 0.85): auto-stash and start new conversation

### PostToolUse

```
Trigger:   After tool execution
Matcher:   Read|Edit|Write|Bash|Grep|Glob|WebFetch|WebSearch
Blocking:  No (returns { async: true })
```

1. Captures the tool use as an observation (tool name, input/output summaries, files involved, tags)
2. Updates session and conversation observation counts
3. Queues for embedding generation
4. Stages in observation buffer
5. Fires async conflict detection against existing memories

### PreToolUse

```
Trigger:   Before Bash execution
Matcher:   Bash
Blocking:  Yes
Returns:   {}
```

Auto-creates a checkpoint before destructive commands when `checkpoints.autoForkBeforeDestructive` is enabled.

**Destructive patterns detected:**

| Pattern                    | Category       |
|----------------------------|----------------|
| `rm -rf`                   | File deletion  |
| `git reset --hard`         | Git destructive|
| `git push --force`         | Git destructive|
| `git clean -f`             | Git destructive|
| `git checkout .`           | Git destructive|
| `git restore .`            | Git destructive|
| `drop table` / `drop database` | Database   |
| `truncate`                 | Database       |
| `format`                   | System         |

### PreCompact

```
Trigger:   Before context window compaction
Blocking:  Yes
Returns:   {}
```

Saves a compaction snapshot observation to preserve context markers.

### SessionEnd

```
Trigger:   Session termination
Blocking:  Yes
Returns:   {}
```

1. Runs [curation agent](#curation-agent) on the observation buffer (if enabled and ≥5 observations)
2. Summarizes all conversations in the session
3. Summarizes the session itself
4. Processes the embedding queue (generates vectors for all pending items)
5. Ends the session record

---

## Knowledge Graph

A directed graph connecting knowledge items, enabling reasoning chains and automatic discovery.

### Knowledge Types

| Type          | Description                               | Color (UI)   |
|---------------|-------------------------------------------|--------------|
| `fact`        | Verified piece of information             | Orange       |
| `decision`    | A choice that was made                    | Green        |
| `preference`  | User or project preference                | Yellow       |
| `pattern`     | Recurring pattern or practice             | Purple       |
| `issue`       | Known problem or bug                      | Red          |
| `context`     | Background information                    | Gray         |
| `discovery`   | Derived/inferred knowledge from combining others | Emerald |

### Edge Relationships

```
     derives_from          leads_to
  A ──────────────▶ B   A ──────────▶ B
  (A was derived       (A enables/
   from B)              causes B)

     supports             contradicts
  A ──────────────▶ B   A ──────────▶ B
  (A provides          (A conflicts
   evidence for B)      with B)

     refines              supersedes
  A ──────────────▶ B   A ──────────▶ B
  (A is more           (A replaces B,
   specific than B)     B is outdated)
```

Each edge has a **strength** value (0.0–1.0) indicating confidence in the relationship.

### Graph Traversal

```
traverseGraph(startId, maxDepth = 5)
```

Uses **breadth-first search** starting from any knowledge node:

```
         ┌── depth 0: Root node
         │
         ├── depth 1: Direct connections
         │     ├── derives_from → Source A
         │     ├── supports → Evidence B
         │     └── leads_to → Consequence C
         │
         ├── depth 2: Connections of connections
         │     ├── Source A → derives_from → Origin D
         │     └── Consequence C → leads_to → Outcome E
         │
         └── ... up to maxDepth (default: 5)
```

**Default depth limit: 5 layers** — prevents exponential blowup in densely connected graphs.

**Specialized traversals:**
- `getDerivationChain(discoveryId)` — Follows `derives_from` edges backwards to find the full reasoning chain
- `findConnected(knowledgeId)` — Returns all directly connected nodes (depth 1)

### Discovery Engine

Fires automatically when new knowledge is saved via `memory_save`:

```
New knowledge saved
        │
        ▼
1. Link to source knowledge IDs
   (creates derives_from edges)
        │
        ▼
2. Search for related existing knowledge
   (creates supports/refines/leads_to edges
    for items with >50% similarity)
        │
        ▼
3. If discoveryEnabled:
   Haiku subagent analyzes combinations
        │
        ├──▶ No discovery possible → done
        │
        └──▶ Discovery found!
              │
              ├──▶ Create knowledge (type: discovery)
              ├──▶ Create derives_from edges to sources
              ├──▶ Queue for embedding
              └──▶ Tag as "auto-discovered"
```

**Example chain:**

```
fact(1+1=2) ◀── derives_from ── discovery(x=3) ── derives_from ──▶ fact(2+x=5)
                                      │
                                      └── leads_to ──▶ discovery(y=...)
```

---

## Conflict Detection

Detects when a new observation looks similar to an existing memory.

```
New observation staged in buffer
        │
        ▼
Build search query from observation summaries
        │
        ▼
Hybrid search against existing memories
        │
        ├──▶ score > 0.95  →  EXACT DUPLICATE  →  silently skip
        │
        ├──▶ score > 0.65  →  SIMILAR           →  flag as needs_clarification
        │    (configurable)        │
        │                          └──▶ Next UserPromptSubmit surfaces conflict
        │                                     │
        │                                     ▼
        │                          Claude asks user (via AskUserQuestion):
        │                          ┌─────────────────────────────────┐
        │                          │ 1. Same thing       → merge    │
        │                          │ 2. Completely new   → keep_both│
        │                          │ 3. Replace old      → replace  │
        │                          │ 4. Don't save       → skip     │
        │                          └─────────────────────────────────┘
        │
        └──▶ score < 0.65  →  NO CONFLICT  →  proceed normally
```

**Thresholds:**
- Exact duplicate: `> 0.95` (auto-skipped, never prompts)
- Similar / conflict: `> 0.65` (configurable via settings)
- Conflicts are surfaced **one at a time** to avoid overwhelming the user

---

## Curation Agent

AI-powered observation curation at session end. Uses a **Haiku subagent** to clean up the observation buffer.

```
Session ending with N observations in buffer
        │
        ▼
N < minObservations (5)?  ──yes──▶  Flush all (skip curation)
        │ no
        ▼
SDK query() available?  ──no──▶  Flush all (skip curation)
        │ yes
        ▼
Build digest of staged observations (≤4000 chars)
        │
        ▼
Haiku subagent decides for each observation:
        │
        ├──▶ KEEP     Meaningful work (edits, architecture decisions)
        ├──▶ DISCARD  Trivial reads, redundant searches, failed retries
        ├──▶ MERGE    Related observations (sequential edits to same file)
        └──▶ EXTRACT  Derive knowledge (facts, decisions, patterns)
```

**Budget cap:** `$0.02 USD` per curation run (configurable).

**Returns:** `{ kept, discarded, merged, knowledgeExtracted }`

---

## Observation Buffer

In-memory staging area for observations before they're committed to the database.

| Status                | Meaning                                    |
|-----------------------|--------------------------------------------|
| `pending`             | Awaiting curation or manual review         |
| `persisted`           | Approved and saved to database             |
| `discarded`           | Rejected / noise                           |
| `needs_clarification` | Flagged by conflict detection              |

**Auto-checkpoint:** Every N observations (default: 20), the buffer writes a recovery checkpoint to the journal to prevent data loss on crash.

**Methods:**

| Method                  | Description                          |
|-------------------------|--------------------------------------|
| `add(entry)`            | Stage a new observation              |
| `flagConflict(id, info)`| Mark as needs_clarification          |
| `resolveConflict(id, r)`| Apply conflict resolution            |
| `getStaged()`           | Get all pending observations         |
| `getPendingConflicts()` | Get unresolved conflicts             |
| `persist(ids)`          | Approve specific items               |
| `discard(ids)`          | Reject specific items                |
| `flush()`               | Persist all pending (bypass curation)|

Visible via **Web UI** → `GET /api/staging` and the staging view.

---

## Checkpoint System

Session save points for recovery and branching.

```
/checkpoint "before refactor"
        │
        ▼
┌─────────────────────────────────────┐
│  SessionFork                        │
│  id: fork_m3abc_xyz123              │
│  session_id: ses_...                │
│  label: "before refactor"           │
│  snapshot:                          │
│    observation_count: 42            │
│    conversation_ids: [conv_...]     │
│    last_observation_id: obs_...     │
│  created_at: 1706745600000          │
└─────────────────────────────────────┘
```

**Auto-fork:** When `checkpoints.autoForkBeforeDestructive` is enabled, the `PreToolUse` hook automatically creates a checkpoint before any destructive Bash command (see [PreToolUse](#pretooluse) for the pattern list).

**Resume from checkpoint:** Pass a `fork_` prefixed ID to `memory_resume` to resume from a checkpoint.

---

## Search Engine

### Hybrid Search

Combines four scoring signals into a single ranked result list:

```
Final Score = (ftsWeight × FTS5 score)
            + (vectorWeight × cosine similarity)
            + (recencyWeight × recency score)
            + (projectAffinityWeight × project match)
```

### Full-Text Search (FTS5)

Four FTS5 virtual tables using **Porter stemming** + **Unicode61** tokenizer:

| Table               | Indexed Columns                      |
|---------------------|--------------------------------------|
| `observations_fts`  | tool_input_summary, tool_output_summary, tags |
| `knowledge_fts`     | content, tags                        |
| `sessions_fts`      | summary, key_actions                 |
| `conversations_fts` | topic, summary                       |

All kept in sync via database triggers (INSERT, UPDATE, DELETE).

### Vector Search

- **Table:** `vec_embeddings` (sqlite-vec virtual table)
- **Dimensions:** 384 (BGE Small EN v1.5 via fastembed)
- **Similarity:** Cosine similarity
- **Source types indexed:** observations, knowledge, sessions

### Scoring Weights

| Weight                   | Default | Description                    |
|--------------------------|---------|--------------------------------|
| `search.ftsWeight`       | `0.40`  | Keyword exact match            |
| `search.vectorWeight`    | `0.40`  | Semantic similarity            |
| `search.recencyWeight`   | `0.10`  | Boost newer results            |
| `search.projectAffinityWeight` | `0.10` | Boost current project results |

All configurable via settings. Weights should sum to 1.0.

---

## Embedding Pipeline

```
Observation/Knowledge created
        │
        ▼
enqueueEmbedding(sourceType, sourceId, text)
        │
        ▼
embedding_queue table (status: pending)
        │
        ▼ (at session end)
processQueue(batchSize = 10)
        │
        ├──▶ Fetch pending items
        ├──▶ Mark as 'processing'
        ├──▶ Generate embeddings via fastembed
        │    (BGE Small EN v1.5, 384 dimensions)
        ├──▶ Store in vec_embeddings table
        └──▶ Mark as 'done' or 'error'
```

**Provider:** `fastembed` (local, no API calls) with BGE Small EN v1.5 model.

**Fallback:** If sqlite-vec extension is unavailable, vector search is disabled and the system relies on FTS5 keyword search + recency scoring only.

---

## Topic Shift Detection

Detects when the user switches topics mid-session, enabling automatic conversation stashing.

### Signal Weights

| Signal                | Weight | Range  | Description                                  |
|-----------------------|--------|--------|----------------------------------------------|
| File overlap          | 0.30   | 0–0.30 | High overlap = same topic                    |
| Time gap              | 0.25   | 0–0.25 | <30s = continuation, >30min = likely new     |
| Directory proximity   | 0.15   | 0–0.15 | Working in same dirs = same topic            |
| Tool pattern change   | 0.15   | 0–0.15 | Code tools → research tools = shift          |
| Prompt structure      | 0.15   | 0–0.15 | Short follow-up = continuation, long = new   |

### Three-Tier Decision

```
Score 0.0 ─────── 0.4 ─────── 0.85 ─────── 1.0
  │                │            │              │
  └── IGNORE ──────┘            │              │
       (same topic)    ASK ─────┘              │
                   (suggest stash)   TRUST ────┘
                                  (auto-stash)
```

**Continuation keywords** (trigger score reduction): "also", "and", "now", "next", "then", "ok", "okay", "great", "thanks", "please", "can you also"

### Adaptive Thresholds

Per-project learning from user feedback:

| Counter                   | Purpose                                   |
|---------------------------|-------------------------------------------|
| `auto_stash_count`        | Times the system auto-stashed             |
| `false_positive_count`    | Times the user rejected a stash suggestion|
| `suggestion_shown_count`  | Total suggestions shown                   |
| `suggestion_accepted_count` | Times user accepted a suggestion        |

---

## Project Detection

Automatically detects the project root and technology stack.

### Project Markers

| Type        | Markers                                                            |
|-------------|--------------------------------------------------------------------|
| Directories | `.git/`, `.claude/`                                                |
| Files       | `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `pom.xml`, `build.gradle` |

**Detection:** Walks up the directory tree from `cwd` until a marker is found. Falls back to `cwd` if none found. Results are cached.

### Stack Detection

Reads project marker files to determine the technology stack:
- `package.json` → Node.js, React, Vue, TypeScript, etc.
- `Cargo.toml` → Rust
- `pyproject.toml` → Python
- `go.mod` → Go
- etc.

Stored as `detected_stack: string[]` on the Project record.

---

## Summarization

Two-tier summarization system with LLM-first, extractive fallback.

### Session Summarization

```
1. Try: SDK query() with Haiku model
   Prompt: "Summarize in 2-4 sentences. Focus on what was done,
            files touched, outcome."
        │
        └──▶ fallback
                │
2. Try: Anthropic SDK direct API call
        │
        └──▶ fallback
                │
3. Extractive: Combine first/last observation,
   unique file paths, tags, tool names
```

### Knowledge Extraction

At session end, Haiku analyzes observations to extract durable knowledge:

| Extracted Type | Example                                           |
|----------------|---------------------------------------------------|
| `fact`         | "This project uses Vite for bundling"             |
| `decision`     | "Chose SQLite over PostgreSQL for portability"    |
| `preference`   | "User prefers functional components over classes" |
| `pattern`      | "Tests are in __tests__/ directories"             |

---

## Recovery Journal

Write-ahead logging for crash resilience on critical database operations.

```
withJournal(operation, tableName, recordId, payload, fn)
        │
        ▼
1. Write pending entry to recovery_journal
        │
        ▼
2. Execute database operation (fn)
        │
        ├──▶ Success → mark 'committed'
        │
        └──▶ Error → mark 'failed', re-throw
```

**On session start:** Pending journal entries are replayed to recover from any mid-write crashes.

**Protected operations:**
- `journaledInsertObservation()` — Observation creation
- `journaledInsertKnowledge()` — Knowledge creation

---

## Web UI

Served at `http://127.0.0.1:37820` (configurable port). Vanilla JS SPA with dark/light theme.

### Dashboard

```
┌──────────┬──────────┬──────────┬──────────┐
│  42      │  15      │  8       │  3       │
│  Obs     │  Knowledge│ Sessions │ Projects │
├──────────┼──────────┼──────────┼──────────┤
│  5       │  127     │  2.4 MB  │  3       │
│  Stashed │  Embedded│  Storage │ Pending  │
└──────────┴──────────┴──────────┴──────────┘
  Top Tags: [typescript] [refactor] [fix] [api]
```

Session-filterable. Shows pending embedding banner when items are queued.

### Search View

Full-text + semantic search across all memory types. Knowledge results are **clickable** — opens the [Graph Explorer](#graph-explorer).

### Timeline View

Interactive chrono-rail with:

- **Vertical timeline axis** with glowing nodes
- **Day / Week / Month** zoom toggle
- **Session blocks** with time, duration, summary, files, observation count badge
- **Expand** any session to see observations on a mini-timeline
- **Click** any observation to open a **detail panel** (slide-in from right)
- **Keyboard navigation** (Tab, Enter/Space, Escape)
- **Load more** for pagination

### Knowledge View

Card grid of all knowledge items with:

- **Type filter chips**: All, Fact, Decision, Preference, Pattern, Issue, Context, Discovery
- **Confidence bar** on each card
- **Click any card** → opens Graph Explorer

### Graph Explorer

Slide-in panel for exploring knowledge connections:

```
┌─────────────────────────────────────────┐
│  ← Back    Knowledge Graph        ✕     │
├─────────────────────────────────────────┤
│  kn_m3abc → kn_x7def → kn_current      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ FOCUS NODE ──────────────────────┐  │
│  │ [discovery] kn_current            │  │
│  │ x = 3 because 1+1=2 and 2+x=5   │  │
│  │ ● 85% confidence · 3 edges       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ── Reasoning Chain (2 steps) ────────  │
│  │                                      │
│  ● fact: 1+1=2             depth 1      │
│  │                                      │
│  ● fact: 2+x=5             depth 1      │
│                                         │
│  ── Connections (3) ──────────────────  │
│                                         │
│  DERIVES FROM                           │
│  ○ [fact] 1+1=2              92% →      │
│  ○ [fact] 2+x=5              92% →      │
│                                         │
│  LEADS TO                               │
│  ○ [discovery] y = ...       78% →      │
│                                         │
└─────────────────────────────────────────┘
```

- **Navigate** by clicking any connected node
- **Breadcrumb trail** shows navigation path
- **Back button** for history
- **Escape** to close

### Settings

All configuration exposed with live controls. Sections:

| Section                    | Controls                                            |
|----------------------------|-----------------------------------------------------|
| Capture                    | Auto-capture toggle, privacy exclusion patterns     |
| Context Injection          | Max tokens, session history depth                   |
| Search Weights             | FTS5, Vector, Recency, Project affinity (sliders)   |
| Embeddings                 | Enable toggle, batch size                           |
| Memory Conflict Detection  | Enable toggle, similarity threshold slider          |
| Curation Agent             | Enable toggle, min observations, max budget         |
| Checkpoints                | Enable toggle, auto-fork toggle                     |
| Observation Buffer         | Checkpoint interval                                 |
| Knowledge Graph            | Enable toggle, max depth, auto-discover toggle      |
| Web UI                     | Port number                                         |
| Danger Zone                | Purge obs / knowledge / sessions / all, export data |

---

## REST API

All endpoints are served from `http://127.0.0.1:37820/api/`.

### Read Endpoints

| Method | Path                              | Description                              |
|--------|-----------------------------------|------------------------------------------|
| GET    | `/api/sessions/active`            | Currently running sessions               |
| GET    | `/api/search?q=&type=&project=`   | Hybrid search                            |
| GET    | `/api/sessions?project=&limit=`   | List sessions                            |
| GET    | `/api/sessions/:id`               | Session detail with observations         |
| GET    | `/api/knowledge?type=&project=`   | List knowledge items                     |
| GET    | `/api/knowledge/:id/graph?depth=` | Knowledge graph traversal                |
| GET    | `/api/conversations?project=`     | List stashed conversations               |
| GET    | `/api/projects`                   | List all projects                        |
| GET    | `/api/stats?project=`             | Usage statistics                         |
| GET    | `/api/config`                     | Current configuration                    |
| GET    | `/api/staging`                    | Observation buffer contents              |
| GET    | `/api/export`                     | Export all data as JSON                  |

### Write Endpoints

| Method | Path                     | Description                              |
|--------|--------------------------|------------------------------------------|
| PUT    | `/api/config`            | Update configuration                     |
| DELETE | `/api/memories/:id`      | Delete specific observation or knowledge |
| DELETE | `/api/data/observations` | Purge all observations                   |
| DELETE | `/api/data/knowledge`    | Purge all knowledge                      |
| DELETE | `/api/data/sessions`     | Purge sessions + conversations + obs     |
| DELETE | `/api/data/all`          | Factory reset — delete everything        |

---

## Configuration

### File Location

```
~/.engram/settings.json
```

Override data directory with environment variable: `ENGRAM_DATA_DIR`

### Full Default Configuration

```json
{
  "dataDir": "~/.engram",
  "maxContextTokens": 2000,
  "sessionHistoryDepth": 10,
  "autoCapture": true,

  "webUI": {
    "enabled": true,
    "port": 37820
  },

  "privacy": {
    "excludePatterns": [".env", "credentials", "secret", ".pem", ".key"]
  },

  "embeddings": {
    "enabled": true,
    "provider": "fastembed",
    "model": "BGESmallENV15",
    "batchSize": 10,
    "dimensions": 384
  },

  "search": {
    "ftsWeight": 0.40,
    "vectorWeight": 0.40,
    "recencyWeight": 0.10,
    "projectAffinityWeight": 0.10
  },

  "curation": {
    "enabled": true,
    "minObservations": 5,
    "maxBudgetUsd": 0.02
  },

  "checkpoints": {
    "enabled": true,
    "autoForkBeforeDestructive": true
  },

  "buffer": {
    "checkpointInterval": 20
  },

  "conflictDetection": {
    "enabled": true,
    "similarityThreshold": 0.65
  },

  "knowledgeGraph": {
    "enabled": true,
    "maxDepth": 5,
    "discoveryEnabled": true
  }
}
```

---

## Database Schema

**Engine:** SQLite with WAL mode, foreign keys enabled, 5s busy timeout.

**Schema version:** 4 (auto-migrates from v1/v2/v3)

### Tables

| Table                | Purpose                           | ID Prefix | Key Columns                              |
|----------------------|-----------------------------------|-----------|------------------------------------------|
| `projects`           | Detected project roots            | —         | root_path, detected_stack, session_count |
| `sessions`           | Claude Code sessions              | `ses_`    | claude_session_id, summary, started_at   |
| `conversations`      | Conversation threads              | `conv_`   | session_id, topic, status, stash_group_id|
| `stash_groups`       | Groups of stashed conversations   | —         | label, project_path                      |
| `observations`       | Tool use recordings               | `obs_`    | tool_name, summaries, files, tags        |
| `knowledge`          | Persistent knowledge items        | `kn_`     | type, content, confidence, sources       |
| `knowledge_edges`    | Knowledge graph connections       | `edge_`   | from_id, to_id, relationship, strength   |
| `embeddings`         | Embedding metadata                | —         | source_type, source_id, text_hash        |
| `embedding_queue`    | Pending embedding jobs            | —         | text_content, status                     |
| `recovery_journal`   | Write-ahead log                   | —         | operation, payload, status               |
| `adaptive_thresholds`| Per-project topic shift tuning    | —         | ask_threshold, trust_threshold           |
| `session_forks`      | Session checkpoints               | `fork_`   | session_id, label, snapshot              |
| `schema_version`     | Migration tracking                | —         | version, applied_at                      |

### Virtual Tables

| Table               | Engine     | Purpose                  |
|---------------------|------------|--------------------------|
| `observations_fts`  | FTS5       | Keyword search on obs    |
| `knowledge_fts`     | FTS5       | Keyword search on knowledge |
| `sessions_fts`      | FTS5       | Keyword search on sessions  |
| `conversations_fts` | FTS5       | Keyword search on conversations |
| `vec_embeddings`    | sqlite-vec | 384-dim vector similarity    |

---

## Plugin Integration

### Entry Point

```typescript
// src/sdk/entry.ts
export async function initEngram(cwd: string): Promise<EngramSdkOptions>
```

Returns:

```typescript
{
  mcpServers: Record<string, unknown>,  // 9 in-process MCP tools
  hooks: Record<string, unknown>,       // 6 SDK hook callbacks
  systemPrompt: string                  // Context injection
}
```

### Plugin Manifest

```
.claude-plugin/plugin.json
```

```json
{
  "name": "engram",
  "version": "2.0.0",
  "description": "Persistent memory for Claude Code — SDK-native plugin",
  "sdk": {
    "entry": "dist/src/sdk/entry.js",
    "init": "initEngram"
  }
}
```

### Package Exports

```json
{
  ".": "./dist/src/sdk/index.js",
  "./sdk": "./dist/src/sdk/index.js",
  "./mcp": "./dist/src/mcp/index.js"
}
```

### Dependencies

| Package                         | Purpose                     |
|---------------------------------|-----------------------------|
| `@anthropic-ai/claude-code`     | Claude Code SDK integration |
| `@anthropic-ai/sdk`             | Anthropic API (summarization fallback) |
| `@modelcontextprotocol/sdk`     | MCP type definitions        |
| `better-sqlite3`                | SQLite database driver      |
| `fastembed`                     | Local embedding generation  |
| `sqlite-vec`                    | Vector similarity extension |
| `zod`                           | Schema validation for MCP tools |
