import path from 'node:path';
import { createLogger } from '../shared/logger.js';
import type { TopicShiftScore, Observation } from '../shared/types.js';

const log = createLogger('conversations:detector');

/** Regex to extract file paths from text (Unix and Windows style). */
const FILE_PATH_RE = /(?:\/[\w.\-]+){2,}(?:\.[\w]+)?|(?:[A-Z]:\\[\w.\-\\]+)/g;

/** Extract unique file paths referenced in a text string. */
function extractFilePaths(text: string): Set<string> {
  const matches = text.match(FILE_PATH_RE);
  return new Set(matches ?? []);
}

/** Extract parent directories from file paths. */
function extractDirectories(files: Set<string>): Set<string> {
  const dirs = new Set<string>();
  for (const f of files) {
    const dir = path.dirname(f);
    if (dir !== f && dir !== '.') {
      dirs.add(dir);
    }
  }
  return dirs;
}

/** Unique tool names from observations. */
function extractToolNames(observations: Observation[]): Set<string> {
  return new Set(observations.map(o => o.tool_name));
}

// ---------------------------------------------------------------------------
// Signal weight constants
// ---------------------------------------------------------------------------

const WEIGHT_FILE_OVERLAP = 0.30;
const WEIGHT_DIR_PROXIMITY = 0.15;
const WEIGHT_TIME_GAP = 0.25;
const WEIGHT_TOOL_PATTERN = 0.15;
const WEIGHT_PROMPT_STRUCTURE = 0.15;

// ---------------------------------------------------------------------------
// Individual signal scorers (each returns 0.0 = same, 1.0 = different)
// ---------------------------------------------------------------------------

/**
 * File path overlap between recent context and new activity.
 * High overlap → 0 (same). No overlap → 1 (different).
 */
function scoreFileOverlap(contextFiles: Set<string>, activityFiles: Set<string>): number {
  if (contextFiles.size === 0 && activityFiles.size === 0) return 0; // no signal
  if (contextFiles.size === 0 || activityFiles.size === 0) return 0.5; // partial signal

  let overlap = 0;
  for (const f of activityFiles) {
    if (contextFiles.has(f)) overlap++;
  }

  const overlapRatio = overlap / activityFiles.size;
  // 100% overlap → 0, 0% overlap → 1
  return 1 - overlapRatio;
}

/**
 * Directory proximity — even without exact file matches, working in the
 * same directories suggests the same topic.
 */
function scoreDirectoryProximity(contextFiles: Set<string>, activityFiles: Set<string>): number {
  const contextDirs = extractDirectories(contextFiles);
  const activityDirs = extractDirectories(activityFiles);

  if (contextDirs.size === 0 && activityDirs.size === 0) return 0;
  if (contextDirs.size === 0 || activityDirs.size === 0) return 0.5;

  let overlap = 0;
  for (const d of activityDirs) {
    if (contextDirs.has(d)) overlap++;
  }

  const overlapRatio = overlap / activityDirs.size;
  return 1 - overlapRatio;
}

/**
 * Time gap between the last observation and now.
 * < 30s → 0 (almost certainly same), > 30min → 1 (probably different).
 */
function scoreTimeGap(lastObservationTimestamp: number | null): number {
  if (!lastObservationTimestamp) return 0; // no data — assume same
  const gapMs = Date.now() - lastObservationTimestamp;
  const gapMinutes = gapMs / 60_000;

  if (gapMinutes < 0.5) return 0;        // < 30 seconds
  if (gapMinutes < 2) return 0.1;         // < 2 minutes
  if (gapMinutes < 5) return 0.25;        // < 5 minutes
  if (gapMinutes < 10) return 0.5;        // < 10 minutes
  if (gapMinutes < 30) return 0.75;       // < 30 minutes
  return 1.0;                              // > 30 minutes
}

/**
 * Tool pattern change — a shift from code editing tools to search/web tools
 * or vice versa may indicate a topic change.
 */
function scoreToolPatternChange(recentTools: Set<string>, newActivity: string): number {
  if (recentTools.size === 0) return 0;

  // Classify tools into broad categories
  const codeTools = new Set(['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob']);
  const researchTools = new Set(['WebFetch', 'WebSearch']);

  const recentIsCode = [...recentTools].some(t => codeTools.has(t));
  const recentIsResearch = [...recentTools].some(t => researchTools.has(t));

  // Check if the new activity mentions patterns suggesting different tool category
  const mentionsUrl = /https?:\/\/|search for|look up|find out/i.test(newActivity);
  const mentionsFile = FILE_PATH_RE.test(newActivity);

  // Research context + file mention = possibly same (looking up docs for code)
  // Code context + URL mention = possibly shifting to research
  if (recentIsCode && !recentIsResearch && mentionsUrl && !mentionsFile) return 0.7;
  if (recentIsResearch && !recentIsCode && mentionsFile && !mentionsUrl) return 0.6;

  return 0; // no strong signal
}

/**
 * Prompt structure — short follow-ups are continuations,
 * long self-contained prompts suggest new topics.
 */
function scorePromptStructure(newActivity: string): number {
  const trimmed = newActivity.trim();
  const wordCount = trimmed.split(/\s+/).length;

  // Very short (< 8 words) — likely a follow-up ("fix the tests", "now do X")
  if (wordCount < 8) return 0;

  // Short (< 20 words) — probably continuation
  if (wordCount < 20) return 0.15;

  // Medium (< 50 words) — ambiguous
  if (wordCount < 50) return 0.3;

  // Long (50+ words) — self-contained, possibly new topic
  // But check for continuation markers
  const continuationRe = /^(also|and |now |next|then|ok |okay|great|thanks|please|can you also)/i;
  if (continuationRe.test(trimmed)) return 0.1;

  return 0.5;
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export interface DetectorContext {
  /** Recent observations from the active conversation. */
  recentObservations: Observation[];
  /** The current conversation topic label. */
  currentTopic: string | null;
  /** The new user prompt or activity text. */
  newActivity: string;
}

/**
 * Score a potential topic shift using multiple weighted signals.
 *
 * Returns a TopicShiftScore with a value from 0.0 (same topic) to 1.0
 * (definitely different). The caller decides what to do based on the
 * adaptive thresholds.
 */
export function scoreTopicShift(ctx: DetectorContext): TopicShiftScore {
  const { recentObservations, newActivity } = ctx;

  // Collect files from recent observations
  const contextFiles = new Set<string>();
  for (const obs of recentObservations) {
    for (const f of obs.files_involved) {
      contextFiles.add(f);
    }
    // Also extract from summaries
    for (const f of extractFilePaths(obs.tool_input_summary || '')) {
      contextFiles.add(f);
    }
  }

  const activityFiles = extractFilePaths(newActivity);
  const recentTools = extractToolNames(recentObservations);
  const lastTimestamp = recentObservations.length > 0
    ? recentObservations[recentObservations.length - 1].timestamp
    : null;

  // Score each signal
  const signals = {
    fileOverlap: scoreFileOverlap(contextFiles, activityFiles),
    directoryProximity: scoreDirectoryProximity(contextFiles, activityFiles),
    timeGap: scoreTimeGap(lastTimestamp),
    toolPatternChange: scoreToolPatternChange(recentTools, newActivity),
    promptStructure: scorePromptStructure(newActivity),
  };

  // Weighted sum
  const score =
    signals.fileOverlap * WEIGHT_FILE_OVERLAP +
    signals.directoryProximity * WEIGHT_DIR_PROXIMITY +
    signals.timeGap * WEIGHT_TIME_GAP +
    signals.toolPatternChange * WEIGHT_TOOL_PATTERN +
    signals.promptStructure * WEIGHT_PROMPT_STRUCTURE;

  // Derive a topic label if score is high enough (above a basic threshold)
  let newTopic: string | null = null;
  if (score >= 0.35) {
    newTopic = deriveTopicLabel(newActivity, activityFiles);
  }

  log.debug('Topic shift scored', {
    score: score.toFixed(3),
    signals: Object.fromEntries(
      Object.entries(signals).map(([k, v]) => [k, (v as number).toFixed(2)])
    ),
    newTopic,
  });

  return { score, signals, newTopic };
}

/**
 * Derive a short topic label from the new activity text.
 * Uses file paths or the first few words as a rough label.
 */
function deriveTopicLabel(activity: string, files: Set<string>): string {
  // Prefer file-based labels
  if (files.size > 0) {
    const first = [...files][0];
    const parsed = path.parse(first);
    return path.join(path.basename(parsed.dir), parsed.base);
  }

  // Fall back to first few words of the prompt
  const words = activity.trim().split(/\s+/).slice(0, 6);
  const label = words.join(' ');
  return label.length > 40 ? label.substring(0, 37) + '...' : label;
}
