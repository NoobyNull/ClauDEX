---
name: engram:status
description: Show Engram system health, build info, and service status
user_invocable: true
arguments: []
---

# /status

Display the Engram status dashboard by fetching pre-built status data from the web API.

## Behavior

1. Fetch `http://127.0.0.1:37820/api/status` (use WebFetch or Bash `curl -s`)
2. Format the JSON response as a clean status report (see format below)
3. If the fetch fails, report that the Engram web server is not running

## Output Format

Format the JSON response as a concise dashboard. Use checkmarks/crosses for booleans, format `dbSize` bytes as KB/MB.

```
Engram Status
==============

System
  Version:      {system.version}
  Node.js:      {system.node}
  Platform:     {system.platform}
  Data dir:     {system.dataDir}
  Database:     {system.dbPath} ({system.dbSize} formatted)
  Log file:     {system.logPath}

Services
  MCP Server:   {services.mcp}
  Web UI:       {services.webUI.enabled ? "enabled on :" + services.webUI.port : "disabled"}
  Hooks:        {services.hooks.length} registered ({services.hooks joined})

Dependencies
  better-sqlite3:  {dependencies.better-sqlite3 ? "installed" : "missing"}
  sqlite-vec:      {dependencies.sqlite-vec ? "installed" : "not available"}
  fastembed:       {dependencies.fastembed ? "installed" : "not available"}

Memory
  Observations:    {memory.observations}
  Knowledge:       {memory.knowledge}
  Sessions:        {memory.sessions}
  Conversations:   {memory.conversations} ({memory.stashed} stashed)
  Projects:        {memory.projects}
  Embeddings:      {memory.embeddings} stored, {memory.pendingEmbeddings} pending
  Top tags:        {memory.topTags formatted as tag(count), ...}

Config
  Auto-capture:       {config.autoCapture ? "on" : "off"}
  Embeddings:         {config.embeddings.provider} / {config.embeddings.model}
  Vector search:      {config.vectorSearch ? "available" : "unavailable"}
  Conflict detection: {config.conflictDetection.enabled ? "on" : "off"} ({config.conflictDetection.threshold * 100}% threshold)
  Checkpoints:        {config.checkpoints.enabled ? "on" : "off"} (auto-fork: {config.checkpoints.autoFork ? "on" : "off"})
  Knowledge graph:    {config.knowledgeGraph ? "on" : "off"}
  Curation:           {config.curation ? "on" : "off"}
```
