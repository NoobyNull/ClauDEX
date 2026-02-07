import { getDb } from '../db/database.js';
import { storeEmbedding } from '../db/vectors.js';
import { createLogger } from '../shared/logger.js';
import { getConfig } from '../shared/config.js';
import { anthropicEmbeddings } from './anthropic.js';
import type { EmbeddingQueueItem } from '../shared/types.js';

const log = createLogger('embeddings:queue');

/**
 * Enqueues a text for embedding generation.
 * The item is inserted into the embedding_queue table with status 'pending'.
 */
export function enqueueEmbedding(sourceType: string, sourceId: string, textContent: string): void {
  const db = getDb();
  const now = Date.now();

  try {
    db.prepare(`
      INSERT INTO embedding_queue (source_type, source_id, text_content, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(sourceType, sourceId, textContent, now);

    log.debug('Enqueued embedding', { sourceType, sourceId });
  } catch (err) {
    log.error('Failed to enqueue embedding', { error: err, sourceType, sourceId });
  }
}

/**
 * Processes pending items in the embedding queue.
 * Fetches a batch of pending items, generates embeddings, and stores them.
 * Returns the number of successfully processed items.
 */
export async function processQueue(batchSize?: number): Promise<number> {
  const config = getConfig();
  const effectiveBatchSize = batchSize ?? config.embeddings.batchSize;

  if (!anthropicEmbeddings.available) {
    log.debug('Embedding provider not available, skipping queue processing');
    return 0;
  }

  const db = getDb();

  // Atomic claim: UPDATE first, then SELECT what we claimed.
  // This prevents two processes from grabbing the same batch.
  const claimToken = `processing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
    UPDATE embedding_queue SET status = ?, error_message = NULL
    WHERE id IN (
      SELECT id FROM embedding_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ?
    )
  `).run(claimToken, effectiveBatchSize);

  const pendingItems = db.prepare(`
    SELECT id, source_type, source_id, text_content, status, error_message, created_at, processed_at
    FROM embedding_queue
    WHERE status = ?
    ORDER BY created_at ASC
  `).all(claimToken) as EmbeddingQueueItem[];

  if (pendingItems.length === 0) {
    log.debug('No pending items in embedding queue');
    return 0;
  }

  log.info('Processing embedding queue', { count: pendingItems.length });

  // Generate embeddings
  const texts = pendingItems.map((item) => item.text_content);
  let embeddings: number[][];

  try {
    embeddings = await anthropicEmbeddings.embed(texts);
  } catch (err) {
    log.error('Batch embedding generation failed', { error: err });
    // Mark all items as error
    const now = Date.now();
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    for (const item of pendingItems) {
      db.prepare(`
        UPDATE embedding_queue SET status = 'error', error_message = ?, processed_at = ? WHERE id = ?
      `).run(errorMsg, now, item.id);
    }
    return 0;
  }

  // Store each embedding and update queue status
  let processed = 0;
  const now = Date.now();

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    const embedding = embeddings[i];

    try {
      const sourceType = item.source_type as 'observation' | 'knowledge' | 'session';
      const stored = storeEmbedding(sourceType, item.source_id, item.text_content, embedding);

      if (stored) {
        db.prepare(`
          UPDATE embedding_queue SET status = 'done', processed_at = ? WHERE id = ?
        `).run(now, item.id);
        processed++;
      } else {
        db.prepare(`
          UPDATE embedding_queue SET status = 'error', error_message = ?, processed_at = ? WHERE id = ?
        `).run('Failed to store embedding (vectors may be unavailable)', now, item.id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      log.error('Failed to store embedding for queue item', { error: err, itemId: item.id });
      db.prepare(`
        UPDATE embedding_queue SET status = 'error', error_message = ?, processed_at = ? WHERE id = ?
      `).run(errorMsg, now, item.id);
    }
  }

  log.info('Queue processing complete', { processed, total: pendingItems.length });
  return processed;
}

/**
 * Returns the count of pending items in the embedding queue.
 */
export function getPendingCount(): number {
  const db = getDb();
  try {
    const row = db.prepare(
      "SELECT COUNT(*) as count FROM embedding_queue WHERE status = 'pending'"
    ).get() as { count: number };
    return row.count;
  } catch {
    return 0;
  }
}

/**
 * Returns the count of errored items in the embedding queue.
 */
export function getErrorCount(): number {
  const db = getDb();
  try {
    const row = db.prepare(
      "SELECT COUNT(*) as count FROM embedding_queue WHERE status = 'error'"
    ).get() as { count: number };
    return row.count;
  } catch {
    return 0;
  }
}
