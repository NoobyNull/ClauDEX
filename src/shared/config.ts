import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { EngramConfig } from './types.js';

const DEFAULT_CONFIG: EngramConfig = {
  dataDir: path.join(os.homedir(), '.engram'),
  maxContextTokens: 2000,
  sessionHistoryDepth: 10,
  autoCapture: true,
  webUI: { enabled: true, port: 37820 },
  privacy: { excludePatterns: ['.env', 'credentials', 'secret', '.pem', '.key'] },
  embeddings: {
    enabled: true,
    provider: 'fastembed',
    model: 'BGESmallENV15',
    batchSize: 10,
    dimensions: 384,
  },
  search: {
    ftsWeight: 0.4,
    vectorWeight: 0.4,
    recencyWeight: 0.1,
    projectAffinityWeight: 0.1,
  },
  curation: {
    enabled: true,
    minObservations: 5,
    maxBudgetUsd: 0.02,
  },
  checkpoints: {
    enabled: true,
    autoForkBeforeDestructive: true,
  },
  buffer: {
    checkpointInterval: 20,
  },
  conflictDetection: {
    enabled: true,
    similarityThreshold: 0.65,
  },
  knowledgeGraph: {
    enabled: true,
    maxDepth: 5,
    discoveryEnabled: true,
  },
};

let cachedConfig: EngramConfig | null = null;

export function resolveDataDir(): string {
  const envDir = process.env['ENGRAM_DATA_DIR'];
  if (envDir) {
    return envDir.startsWith('~') ? envDir.replace('~', os.homedir()) : envDir;
  }
  return path.join(os.homedir(), '.engram');
}

export function getConfig(): EngramConfig {
  if (cachedConfig) return cachedConfig;

  const dataDir = resolveDataDir();
  const settingsPath = path.join(dataDir, 'settings.json');

  let userConfig: Partial<EngramConfig> = {};
  try {
    if (fs.existsSync(settingsPath)) {
      userConfig = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch {
    // Use defaults if settings file is invalid
  }

  cachedConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    dataDir,
    webUI: { ...DEFAULT_CONFIG.webUI, ...userConfig.webUI },
    privacy: { ...DEFAULT_CONFIG.privacy, ...userConfig.privacy },
    embeddings: { ...DEFAULT_CONFIG.embeddings, ...userConfig.embeddings },
    search: { ...DEFAULT_CONFIG.search, ...userConfig.search },
    curation: { ...DEFAULT_CONFIG.curation!, ...userConfig.curation },
    checkpoints: { ...DEFAULT_CONFIG.checkpoints!, ...userConfig.checkpoints },
    buffer: { ...DEFAULT_CONFIG.buffer!, ...userConfig.buffer },
    conflictDetection: { ...DEFAULT_CONFIG.conflictDetection!, ...userConfig.conflictDetection },
    knowledgeGraph: { ...DEFAULT_CONFIG.knowledgeGraph!, ...userConfig.knowledgeGraph },
  };

  return cachedConfig;
}

export function ensureDataDir(): string {
  const config = getConfig();
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
  return config.dataDir;
}

export function getDbPath(): string {
  return path.join(ensureDataDir(), 'engram.db');
}

export function isPrivacyExcluded(filePath: string): boolean {
  const config = getConfig();
  const lower = filePath.toLowerCase();
  return config.privacy.excludePatterns.some(pattern =>
    lower.includes(pattern.toLowerCase())
  );
}

export function saveConfig(updates: Partial<EngramConfig>): EngramConfig {
  const dataDir = resolveDataDir();
  const settingsPath = path.join(dataDir, 'settings.json');

  // Read existing file-level overrides (not merged defaults)
  let existing: Partial<EngramConfig> = {};
  try {
    if (fs.existsSync(settingsPath)) {
      existing = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch { /* start fresh */ }

  // Deep-merge nested objects
  const merged: Partial<EngramConfig> = { ...existing };
  if (updates.maxContextTokens !== undefined) merged.maxContextTokens = updates.maxContextTokens;
  if (updates.sessionHistoryDepth !== undefined) merged.sessionHistoryDepth = updates.sessionHistoryDepth;
  if (updates.autoCapture !== undefined) merged.autoCapture = updates.autoCapture;
  if (updates.webUI) merged.webUI = { ...existing.webUI, ...updates.webUI };
  if (updates.privacy) merged.privacy = { ...existing.privacy, ...updates.privacy };
  if (updates.embeddings) merged.embeddings = { ...existing.embeddings, ...updates.embeddings };
  if (updates.search) merged.search = { ...existing.search, ...updates.search };
  if (updates.curation) merged.curation = { ...existing.curation, ...updates.curation };
  if (updates.checkpoints) merged.checkpoints = { ...existing.checkpoints, ...updates.checkpoints };
  if (updates.buffer) merged.buffer = { ...existing.buffer, ...updates.buffer };
  if (updates.conflictDetection) merged.conflictDetection = { ...existing.conflictDetection, ...updates.conflictDetection };
  if (updates.knowledgeGraph) merged.knowledgeGraph = { ...existing.knowledgeGraph, ...updates.knowledgeGraph };

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2));

  // Bust the cache so next getConfig() picks up changes
  cachedConfig = null;
  return getConfig();
}

export function resetConfigCache(): void {
  cachedConfig = null;
}
