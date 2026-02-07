import type { Session, Conversation, Knowledge, Project } from '../shared/types.js';
import { estimateTokens, truncateToTokens } from './tokenizer.js';
import { createLogger } from '../shared/logger.js';

const log = createLogger('context-builder');

export interface ContextInput {
  project: Project;
  recentSessions: Session[];
  conversations: Conversation[];
  stashedSidebars: Array<{ conversation: Conversation; groupLabel: string | null }>;
  knowledge: Knowledge[];
  maxTokens: number;
}

export function buildSessionStartContext(input: ContextInput): string {
  const { project, recentSessions, conversations, stashedSidebars, knowledge, maxTokens } = input;
  const parts: string[] = [];

  // Header
  parts.push(`[Engram Memory] Project: ${project.name} (${project.root_path})`);
  if (project.detected_stack.length > 0) {
    parts.push(`Stack: ${project.detected_stack.join(', ')}`);
  }

  // Budget allocation
  const sessionBudget = Math.floor(maxTokens * 0.35);
  const knowledgeBudget = Math.floor(maxTokens * 0.35);
  const stashBudget = Math.floor(maxTokens * 0.15);
  const filesBudget = Math.floor(maxTokens * 0.15);

  // Recent sessions with conversations
  const sessionSection = buildSessionSection(recentSessions, conversations, sessionBudget);
  if (sessionSection) parts.push(sessionSection);

  // Key knowledge
  const knowledgeSection = buildKnowledgeSection(knowledge, knowledgeBudget);
  if (knowledgeSection) parts.push(knowledgeSection);

  // Stashed sidebars
  const stashSection = buildStashSection(stashedSidebars, stashBudget);
  if (stashSection) parts.push(stashSection);

  // Recent files
  const filesSection = buildRecentFilesSection(recentSessions, filesBudget);
  if (filesSection) parts.push(filesSection);

  // Footer
  parts.push('→ Use mcp__engram__memory_resume to pick up a stashed sidebar');
  parts.push('→ Use mcp__engram__memory_search to find specific memories');

  const result = parts.join('\n');
  log.info('Built context', { tokens: estimateTokens(result), maxTokens });
  return result;
}

function buildSessionSection(sessions: Session[], conversations: Conversation[], budget: number): string | null {
  if (sessions.length === 0) return null;

  const lines: string[] = [];
  let usedTokens = 0;

  for (const session of sessions.slice(0, 5)) {
    const age = formatAge(session.started_at);
    const resumable = session.is_resumable && session.claude_session_id
      ? ` [resumable: claude --resume ${session.claude_session_id}]`
      : '';

    const header = `Last session (${age})${resumable}:`;
    usedTokens += estimateTokens(header);
    if (usedTokens > budget) break;
    lines.push(header);

    // Find conversations for this session
    const sessionConvs = conversations.filter(c => c.session_id === session.id);
    for (const conv of sessionConvs.slice(0, 3)) {
      const topic = conv.topic || 'untitled';
      const summary = conv.summary ? `: ${truncateToTokens(conv.summary, 50)}` : '';
      const convLine = `  ├─ ${topic}${summary}`;
      usedTokens += estimateTokens(convLine);
      if (usedTokens > budget) break;
      lines.push(convLine);
    }

    if (session.summary && sessionConvs.length === 0) {
      const summaryLine = `  Summary: ${truncateToTokens(session.summary, 80)}`;
      usedTokens += estimateTokens(summaryLine);
      if (usedTokens <= budget) lines.push(summaryLine);
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

function buildKnowledgeSection(knowledge: Knowledge[], budget: number): string | null {
  if (knowledge.length === 0) return null;

  const items: string[] = [];
  let usedTokens = 0;
  const header = 'Key knowledge:';
  usedTokens += estimateTokens(header);

  for (const k of knowledge.slice(0, 10)) {
    const item = `  [${k.type}] ${truncateToTokens(k.content, 60)}`;
    const tokens = estimateTokens(item);
    if (usedTokens + tokens > budget) break;
    items.push(item);
    usedTokens += tokens;
  }

  if (items.length === 0) return null;
  return header + '\n' + items.join('\n');
}

function buildStashSection(
  stashed: Array<{ conversation: Conversation; groupLabel: string | null }>,
  budget: number,
): string | null {
  if (stashed.length === 0) return null;

  const lines: string[] = [`Stashed sidebars (${stashed.length}):`];
  let usedTokens = estimateTokens(lines[0]);

  for (const { conversation, groupLabel } of stashed.slice(0, 5)) {
    const tag = groupLabel ? `[${groupLabel}]` : '';
    const topic = conversation.topic || 'untitled';
    const age = formatAge(conversation.stashed_at || conversation.started_at);
    const line = `  ├─ ${tag} ${topic} (${age})`;
    const tokens = estimateTokens(line);
    if (usedTokens + tokens > budget) break;
    lines.push(line);
    usedTokens += tokens;
  }

  return lines.length > 1 ? lines.join('\n') : null;
}

function buildRecentFilesSection(sessions: Session[], budget: number): string | null {
  const allFiles = new Set<string>();
  for (const session of sessions) {
    for (const f of session.files_modified) {
      allFiles.add(f);
    }
  }

  if (allFiles.size === 0) return null;

  const fileList = [...allFiles].slice(0, 10).join(', ');
  const line = `Recent files: ${fileList}`;
  return estimateTokens(line) <= budget ? line : null;
}

function formatAge(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
