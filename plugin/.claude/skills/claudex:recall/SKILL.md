---
name: claudex:recall
description: Search persistent memory conversationally
user_invocable: true
arguments:
  - name: query
    description: What to search for
    required: true
---

# /claudex:recall [query]

Search ClauDEX persistent memory with a conversational interface.

## Behavior

1. Call `memory_search` with the user's query
2. Present results grouped by type:
   - **Knowledge**: facts, decisions, preferences, patterns
   - **Observations**: tool usage records
   - **Sessions**: past work sessions
   - **Conversations**: topic threads
3. For each result, show:
   - A brief snippet of the content
   - Relevance score
   - When it was recorded
   - Associated tags
4. If results span multiple categories, summarize the key findings conversationally
5. Offer to dive deeper into specific results using `memory_get` if the user wants more detail

## Search Tips

The search uses hybrid FTS5 keyword + vector semantic matching, so:
- Exact terms work great: `/claudex:recall authentication middleware`
- Natural language works too: `/claudex:recall how do we handle errors in the API`
- You can filter: `/claudex:recall type:knowledge database` or `/claudex:recall project:/path/to/repo auth`

## Examples

- `/claudex:recall authentication` → shows all memories related to auth across all types
- `/claudex:recall what testing framework do we use` → finds preference/knowledge items about testing
- `/claudex:recall recent work on the API` → shows recent observations and sessions involving API files
