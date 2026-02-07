---
name: engram:recall
description: Search persistent memory conversationally
user_invocable: true
arguments:
  - name: query
    description: What to search for
    required: true
---

# /recall [query]

Search Engram persistent memory with a conversational interface.

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
- Exact terms work great: `/recall authentication middleware`
- Natural language works too: `/recall how do we handle errors in the API`
- You can filter: `/recall type:knowledge database` or `/recall project:/path/to/repo auth`

## Examples

- `/recall authentication` → shows all memories related to auth across all types
- `/recall what testing framework do we use` → finds preference/knowledge items about testing
- `/recall recent work on the API` → shows recent observations and sessions involving API files
