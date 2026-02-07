/**
 * Embedding provider interface for Engram.
 * All embedding backends must implement this contract.
 */
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
  readonly available: boolean;
}
