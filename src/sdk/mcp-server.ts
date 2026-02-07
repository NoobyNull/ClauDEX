import { z } from 'zod';
import { handleSearch } from '../mcp/tools/search.js';
import { handleSave } from '../mcp/tools/save.js';
import { handleTimeline } from '../mcp/tools/timeline.js';
import { handleGet } from '../mcp/tools/get.js';
import { handleForget } from '../mcp/tools/forget.js';
import { handleStash } from '../mcp/tools/stash.js';
import { handleResume } from '../mcp/tools/resume.js';
import { handleStats } from '../mcp/tools/stats.js';
import { handleResolve } from '../mcp/tools/resolve.js';
import { createLogger } from '../shared/logger.js';

const log = createLogger('sdk:mcp');

// Zod schemas for MCP tool inputs
const SearchSchema = z.object({
  query: z.string().describe('Search query — can be keywords, file names, concepts, or natural language'),
  type: z.enum(['all', 'observations', 'knowledge', 'sessions', 'conversations']).optional().describe('Filter by type (default: all)'),
  project: z.string().optional().describe('Filter by project path'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  from_date: z.string().optional().describe('Start date filter (ISO 8601)'),
  to_date: z.string().optional().describe('End date filter (ISO 8601)'),
  limit: z.number().optional().describe('Max results (default: 20)'),
});

const SaveSchema = z.object({
  content: z.string().describe('The knowledge to save'),
  type: z.enum(['fact', 'decision', 'preference', 'pattern', 'issue', 'context', 'discovery']).describe('Knowledge type'),
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
  project: z.string().optional().describe('Associated project path'),
  source_knowledge_ids: z.array(z.string()).optional().describe('IDs of knowledge items this derives from (for discoveries)'),
});

const TimelineSchema = z.object({
  around: z.string().optional().describe('Center the timeline around this ISO 8601 date'),
  session_id: z.string().optional().describe('Filter by session ID'),
  conversation_id: z.string().optional().describe('Filter by conversation ID'),
  project: z.string().optional().describe('Filter by project path'),
  limit: z.number().optional().describe('Max results (default: 20)'),
});

const GetSchema = z.object({
  ids: z.array(z.string()).describe('IDs to fetch'),
  include_context: z.boolean().optional().describe('Include surrounding session context (default: false)'),
  include_graph: z.boolean().optional().describe('Include knowledge graph edges and reasoning chains (default: false)'),
});

const ForgetSchema = z.object({
  ids: z.array(z.string()).optional().describe('Specific IDs to delete'),
  query: z.string().optional().describe('Delete memories matching this search query'),
  before_date: z.string().optional().describe('Delete memories before this ISO 8601 date'),
});

const StashSchema = z.object({
  list: z.boolean().optional().describe('List all stashed sidebars (default: true)'),
  group: z.string().optional().describe('Filter by stash group ID'),
  project: z.string().optional().describe('Filter by project path'),
});

const ResumeSchema = z.object({
  conversation_id: z.string().describe('The conversation ID to resume'),
});

const StatsSchema = z.object({
  project: z.string().optional().describe('Filter stats by project path'),
});

const ResolveSchema = z.object({
  conflict_id: z.string().describe('The observation ID of the conflicting new memory'),
  existing_id: z.string().optional().describe('The ID of the existing memory it conflicts with'),
  action: z.enum(['merge', 'keep_both', 'replace', 'skip']).describe('How to resolve: merge, keep_both, replace, or skip'),
});

/** Tool definition compatible with the Claude Code SDK tool() shape. */
export interface SdkToolDef {
  name: string;
  description: string;
  schema: z.ZodType;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

/** All Engram MCP tools as SDK-native definitions. */
export function getEngramTools(): SdkToolDef[] {
  return [
    {
      name: 'memory_search',
      description: 'Search your persistent memory across observations, knowledge, sessions, and conversations. Uses hybrid FTS5 keyword + vector semantic search for best results.',
      schema: SearchSchema,
      handler: async (args) => {
        log.info('Tool call', { name: 'memory_search' });
        return handleSearch(args);
      },
    },
    {
      name: 'memory_save',
      description: 'Explicitly save a piece of knowledge — a fact, decision, preference, pattern, issue, or context. This is stored permanently and searchable.',
      schema: SaveSchema,
      handler: async (args) => {
        log.info('Tool call', { name: 'memory_save' });
        return handleSave(args);
      },
    },
    {
      name: 'memory_timeline',
      description: 'View chronological observations and activity, optionally filtered by session, conversation, project, or time range.',
      schema: TimelineSchema,
      handler: async (args) => {
        log.info('Tool call', { name: 'memory_timeline' });
        return handleTimeline(args);
      },
    },
    {
      name: 'memory_get',
      description: 'Fetch full details for specific memory IDs (observations, knowledge, sessions, or conversations).',
      schema: GetSchema,
      handler: async (args) => {
        log.info('Tool call', { name: 'memory_get' });
        return handleGet(args);
      },
    },
    {
      name: 'memory_forget',
      description: 'Delete memories for privacy. Can delete by ID, search query, or date range.',
      schema: ForgetSchema,
      handler: async (args) => {
        log.info('Tool call', { name: 'memory_forget' });
        return handleForget(args);
      },
    },
    {
      name: 'memory_stash',
      description: 'List stashed sidebar conversations. These are paused conversation threads that can be resumed.',
      schema: StashSchema,
      handler: async (args) => {
        log.info('Tool call', { name: 'memory_stash' });
        return handleStash(args);
      },
    },
    {
      name: 'memory_resume',
      description: 'Resume a stashed sidebar conversation. Returns context for injection and, if available, the Claude session ID for native resume.',
      schema: ResumeSchema,
      handler: async (args) => {
        log.info('Tool call', { name: 'memory_resume' });
        return handleResume(args);
      },
    },
    {
      name: 'memory_stats',
      description: 'Get usage analytics — observation count, knowledge count, session count, stash count, top tags, storage size.',
      schema: StatsSchema,
      handler: async (args) => {
        log.info('Tool call', { name: 'memory_stats' });
        return handleStats(args);
      },
    },
    {
      name: 'memory_resolve',
      description: 'Resolve a memory conflict when a new observation is similar to an existing memory. Actions: merge (combine into one), keep_both (save separately), replace (update old with new), skip (discard the new one).',
      schema: ResolveSchema,
      handler: async (args) => {
        log.info('Tool call', { name: 'memory_resolve' });
        return handleResolve(args);
      },
    },
  ];
}

/**
 * Create the in-process MCP server configuration for the Claude Code SDK.
 * Returns a record suitable for the `mcpServers` option.
 */
export function createEngramMcpServer(): Record<string, unknown> {
  const tools = getEngramTools();

  // Build tool definitions in MCP-compatible format
  const toolDefs = tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.schema),
  }));

  // Build handler map
  const handlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();
  for (const t of tools) {
    handlers.set(t.name, t.handler);
  }

  return {
    tools: toolDefs,
    handlers,
  };
}

/** Minimal Zod-to-JSON-Schema converter for our tool schemas. */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, val] of Object.entries(shape)) {
      const zodVal = val as z.ZodType;
      properties[key] = zodFieldToJsonSchema(zodVal);
      if (!isOptional(zodVal)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }
  return { type: 'object' };
}

function isOptional(schema: z.ZodType): boolean {
  return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault;
}

function zodFieldToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Unwrap optionals
  if (schema instanceof z.ZodOptional) {
    return zodFieldToJsonSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return zodFieldToJsonSchema(schema.removeDefault());
  }

  if (schema instanceof z.ZodString) {
    return { type: 'string', description: schema.description };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'number', description: schema.description };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean', description: schema.description };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: schema.options, description: schema.description };
  }
  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: zodFieldToJsonSchema(schema.element), description: schema.description };
  }

  return { type: 'string' };
}
