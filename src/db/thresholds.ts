import { getDb } from './database.js';
import type { AdaptiveThresholds } from '../shared/types.js';
import { createLogger } from '../shared/logger.js';

const log = createLogger('db:thresholds');

const DEFAULT_ASK = 0.4;
const DEFAULT_TRUST = 0.85;

export function getThresholds(projectId: string): AdaptiveThresholds {
  const db = getDb();
  const row = db.prepare('SELECT * FROM adaptive_thresholds WHERE project_id = ?').get(projectId) as Record<string, unknown> | undefined;

  if (row) {
    return {
      project_id: row['project_id'] as string,
      ask_threshold: row['ask_threshold'] as number,
      trust_threshold: row['trust_threshold'] as number,
      auto_stash_count: row['auto_stash_count'] as number,
      false_positive_count: row['false_positive_count'] as number,
      suggestion_shown_count: row['suggestion_shown_count'] as number,
      suggestion_accepted_count: row['suggestion_accepted_count'] as number,
      updated_at: row['updated_at'] as number,
    };
  }

  // First time — create defaults
  const now = Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO adaptive_thresholds
      (project_id, ask_threshold, trust_threshold, auto_stash_count, false_positive_count, suggestion_shown_count, suggestion_accepted_count, updated_at)
    VALUES (?, ?, ?, 0, 0, 0, 0, ?)
  `).run(projectId, DEFAULT_ASK, DEFAULT_TRUST, now);

  return {
    project_id: projectId,
    ask_threshold: DEFAULT_ASK,
    trust_threshold: DEFAULT_TRUST,
    auto_stash_count: 0,
    false_positive_count: 0,
    suggestion_shown_count: 0,
    suggestion_accepted_count: 0,
    updated_at: now,
  };
}

/** Record that the system auto-stashed a conversation. */
export function recordAutoStash(projectId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE adaptive_thresholds
    SET auto_stash_count = auto_stash_count + 1, updated_at = ?
    WHERE project_id = ?
  `).run(Date.now(), projectId);
}

/**
 * Record a false positive: the user resumed a conversation within minutes
 * of it being auto-stashed, meaning the auto-stash was wrong.
 */
export function recordFalsePositive(projectId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE adaptive_thresholds
    SET false_positive_count = false_positive_count + 1, updated_at = ?
    WHERE project_id = ?
  `).run(Date.now(), projectId);
  log.info('Recorded false positive for topic shift', { projectId });
  recalibrate(projectId);
}

/** Record that Engram showed a topic-shift suggestion to the user. */
export function recordSuggestionShown(projectId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE adaptive_thresholds
    SET suggestion_shown_count = suggestion_shown_count + 1, updated_at = ?
    WHERE project_id = ?
  `).run(Date.now(), projectId);
}

/** Record that the user accepted a topic-shift suggestion (manually stashed). */
export function recordSuggestionAccepted(projectId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE adaptive_thresholds
    SET suggestion_accepted_count = suggestion_accepted_count + 1, updated_at = ?
    WHERE project_id = ?
  `).run(Date.now(), projectId);
  recalibrate(projectId);
}

/**
 * Recalibrate thresholds based on accumulated feedback.
 *
 * - High false-positive rate → raise trust threshold (be more conservative)
 * - Low false-positive rate  → lower trust threshold (earned autonomy)
 * - High suggestion acceptance → lower ask threshold (user finds them useful)
 * - Low suggestion acceptance  → raise ask threshold (less noise)
 */
function recalibrate(projectId: string): void {
  const t = getThresholds(projectId);
  let { ask_threshold, trust_threshold } = t;

  // Need minimum sample sizes before adjusting
  const MIN_AUTO_STASH_SAMPLES = 5;
  const MIN_SUGGESTION_SAMPLES = 5;

  // --- Trust threshold adjustment ---
  if (t.auto_stash_count >= MIN_AUTO_STASH_SAMPLES) {
    const falsePositiveRate = t.false_positive_count / t.auto_stash_count;

    if (falsePositiveRate > 0.20) {
      // Too many false positives — become more conservative
      trust_threshold = Math.min(0.95, trust_threshold + 0.05);
      log.info('Raising trust threshold (high false positive rate)', {
        projectId, falsePositiveRate: falsePositiveRate.toFixed(2), newThreshold: trust_threshold,
      });
    } else if (falsePositiveRate < 0.05 && t.auto_stash_count >= 10) {
      // Very accurate — earn more autonomy
      trust_threshold = Math.max(0.60, trust_threshold - 0.02);
      log.info('Lowering trust threshold (low false positive rate)', {
        projectId, falsePositiveRate: falsePositiveRate.toFixed(2), newThreshold: trust_threshold,
      });
    }
  }

  // --- Ask threshold adjustment ---
  if (t.suggestion_shown_count >= MIN_SUGGESTION_SAMPLES) {
    const acceptanceRate = t.suggestion_accepted_count / t.suggestion_shown_count;

    if (acceptanceRate > 0.60) {
      // User finds suggestions useful — show them more often
      ask_threshold = Math.max(0.20, ask_threshold - 0.02);
      log.info('Lowering ask threshold (high suggestion acceptance)', {
        projectId, acceptanceRate: acceptanceRate.toFixed(2), newThreshold: ask_threshold,
      });
    } else if (acceptanceRate < 0.20 && t.suggestion_shown_count >= 10) {
      // User ignores most suggestions — show fewer
      ask_threshold = Math.min(0.60, ask_threshold + 0.05);
      log.info('Raising ask threshold (low suggestion acceptance)', {
        projectId, acceptanceRate: acceptanceRate.toFixed(2), newThreshold: ask_threshold,
      });
    }
  }

  // Ensure ask < trust always
  if (ask_threshold >= trust_threshold) {
    ask_threshold = trust_threshold - 0.10;
  }

  // Persist if changed
  if (ask_threshold !== t.ask_threshold || trust_threshold !== t.trust_threshold) {
    const db = getDb();
    db.prepare(`
      UPDATE adaptive_thresholds SET ask_threshold = ?, trust_threshold = ?, updated_at = ?
      WHERE project_id = ?
    `).run(ask_threshold, trust_threshold, Date.now(), projectId);
  }
}
