export interface Project {
  id: string;
  root_path: string;
  name: string;
  detected_stack: string[];
  first_seen: number;
  last_seen: number;
  session_count: number;
  observation_count: number;
}

export interface Session {
  id: string;
  claude_session_id: string | null;
  project_id: string;
  summary: string | null;
  key_actions: string[];
  files_modified: string[];
  started_at: number;
  ended_at: number | null;
  is_resumable: boolean;
  observation_count: number;
}

export interface Conversation {
  id: string;
  session_id: string;
  topic: string | null;
  summary: string | null;
  status: 'active' | 'stashed' | 'completed';
  stash_group_id: string | null;
  project_path: string;
  started_at: number;
  ended_at: number | null;
  resumed_at: number | null;
  stashed_at: number | null;
  observation_count: number;
}

export interface StashGroup {
  id: string;
  label: string | null;
  project_path: string | null;
  created_at: number;
  updated_at: number;
}

export interface Observation {
  id: string;
  session_id: string;
  conversation_id: string | null;
  tool_name: string;
  tool_input_summary: string | null;
  tool_output_summary: string | null;
  project_path: string;
  files_involved: string[];
  tags: string[];
  timestamp: number;
}

export interface Knowledge {
  id: string;
  type: KnowledgeType;
  content: string;
  source_observation_ids: string[];
  source_knowledge_ids: string[];
  conversation_id: string | null;
  project_path: string | null;
  tags: string[];
  confidence: number;
  created_at: number;
  updated_at: number;
}

export type KnowledgeType = 'fact' | 'decision' | 'preference' | 'pattern' | 'issue' | 'context' | 'discovery';

/** A directed edge in the knowledge graph. */
export interface KnowledgeEdge {
  id: string;
  from_id: string;
  to_id: string;
  relationship: KnowledgeRelationship;
  strength: number;
  created_at: number;
}

export type KnowledgeRelationship =
  | 'derives_from'   // A was derived from B (B is a source of A)
  | 'leads_to'       // A leads to B (A enables/causes B)
  | 'supports'       // A provides evidence for B
  | 'contradicts'    // A conflicts with B
  | 'refines'        // A is a more specific version of B
  | 'supersedes';    // A replaces B (B is outdated)

/** A node in the knowledge graph with its connections. */
export interface KnowledgeGraphNode {
  knowledge: Knowledge;
  edges: KnowledgeEdge[];
  depth: number;
}

/** Result of traversing the knowledge graph from a starting node. */
export interface KnowledgeChain {
  root: Knowledge;
  nodes: KnowledgeGraphNode[];
  maxDepthReached: boolean;
}

export interface Embedding {
  id: string;
  source_type: 'observation' | 'knowledge' | 'session';
  source_id: string;
  text_hash: string;
  created_at: number;
}

export interface EmbeddingQueueItem {
  id: number;
  source_type: string;
  source_id: string;
  text_content: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error_message: string | null;
  created_at: number;
  processed_at: number | null;
}

export interface RecoveryJournalEntry {
  id: number;
  operation: string;
  table_name: string;
  record_id: string;
  payload: string;
  status: 'pending' | 'committed' | 'failed';
  created_at: number;
  committed_at: number | null;
}

export interface SearchResult {
  id: string;
  type: 'observation' | 'knowledge' | 'session' | 'conversation';
  snippet: string;
  score: number;
  timestamp: number;
  project_path: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface SearchOptions {
  query: string;
  type?: 'all' | 'observations' | 'knowledge' | 'sessions' | 'conversations';
  project?: string;
  tags?: string[];
  from_date?: string;
  to_date?: string;
  limit?: number;
}

export interface EngramConfig {
  dataDir: string;
  maxContextTokens: number;
  sessionHistoryDepth: number;
  autoCapture: boolean;
  webUI: {
    enabled: boolean;
    port: number;
  };
  privacy: {
    excludePatterns: string[];
  };
  embeddings: {
    enabled: boolean;
    provider: string;
    model: string;
    batchSize: number;
    dimensions: number;
  };
  search: {
    ftsWeight: number;
    vectorWeight: number;
    recencyWeight: number;
    projectAffinityWeight: number;
  };
  curation?: {
    enabled: boolean;
    minObservations: number;
    maxBudgetUsd: number;
  };
  checkpoints?: {
    enabled: boolean;
    autoForkBeforeDestructive: boolean;
  };
  buffer?: {
    checkpointInterval: number;
  };
  conflictDetection?: {
    enabled: boolean;
    similarityThreshold: number;
  };
  knowledgeGraph?: {
    enabled: boolean;
    maxDepth: number;
    discoveryEnabled: boolean;
  };
}

export interface HookInput {
  session_id?: string;
  cwd?: string;
  source?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: string;
  prompt?: string;
  transcript_path?: string;
}

// ---------------------------------------------------------------------------
// Topic shift detection
// ---------------------------------------------------------------------------

/** Result of scoring a potential topic shift. */
export interface TopicShiftScore {
  /** Overall score: 0.0 = definitely same topic, 1.0 = definitely different. */
  score: number;
  /** Individual signal contributions (for debugging / threshold tuning). */
  signals: {
    fileOverlap: number;       // 0–0.30
    directoryProximity: number; // 0–0.15
    timeGap: number;           // 0–0.25
    toolPatternChange: number; // 0–0.15
    promptStructure: number;   // 0–0.15
  };
  /** Short label for the new topic (null if same topic). */
  newTopic: string | null;
}

/** What action the three-tier system decided to take. */
export type TopicShiftAction = 'ignore' | 'ask' | 'trust';

/** Persisted adaptive thresholds for a project. */
export interface AdaptiveThresholds {
  project_id: string;
  ask_threshold: number;       // Default 0.4
  trust_threshold: number;     // Default 0.85
  auto_stash_count: number;
  false_positive_count: number;
  suggestion_shown_count: number;
  suggestion_accepted_count: number;
  updated_at: number;
}

export interface MemoryStats {
  observations: number;
  knowledge: number;
  sessions: number;
  conversations: number;
  stashed: number;
  projects: number;
  embeddings: number;
  pendingEmbeddings: number;
  storageBytes: number;
  topTags: Array<{ tag: string; count: number }>;
}

// ---------------------------------------------------------------------------
// SDK types
// ---------------------------------------------------------------------------

/** A staged observation in the buffer awaiting curation. */
export interface StagedObservation {
  bufferId: number;
  observation: Observation;
  source: 'auto' | 'manual';
  stagedAt: number;
  status: 'pending' | 'persisted' | 'discarded' | 'needs_clarification';
  conflict?: ConflictInfo;
}

/** A session fork / checkpoint. */
export interface SessionFork {
  id: string;
  session_id: string;
  label: string | null;
  snapshot: Record<string, unknown>;
  created_at: number;
}

/** Result returned by the curation agent. */
export interface CurationResult {
  kept: number;
  discarded: number;
  merged: number;
  knowledgeExtracted: number;
  actions: Array<{
    index: number;
    action: 'keep' | 'discard' | 'merge';
    mergeWith?: number[];
  }>;
}

/** Info about a detected memory conflict requiring user clarification. */
export interface ConflictInfo {
  newObservationId: string;
  existingMemory: SearchResult;
  similarity: number;
  level: 'duplicate' | 'similar';
  resolved: boolean;
  resolution: 'merge' | 'keep_both' | 'replace' | 'skip' | null;
}

/** Options returned by initEngram() for the Claude Code SDK. */
export interface EngramSdkOptions {
  mcpServers: Record<string, unknown>;
  hooks: Record<string, unknown>;
  systemPrompt: string;
}
