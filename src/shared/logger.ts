import fs from 'node:fs';
import path from 'node:path';
import { resolveDataDir } from './config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let logLevel: LogLevel = (process.env['ENGRAM_LOG_LEVEL'] as LogLevel) || 'info';
let logFile: string | null = null;

function getLogFile(): string {
  if (!logFile) {
    const dataDir = resolveDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    logFile = path.join(dataDir, 'engram.log');
  }
  return logFile;
}

function formatMessage(level: LogLevel, component: string, message: string, data?: unknown): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] [${component}] ${message}`;
  if (data !== undefined) {
    try {
      return `${base} ${JSON.stringify(data)}`;
    } catch {
      return `${base} [unstringifiable data]`;
    }
  }
  return base;
}

function writeLog(formatted: string, toStderr = false): void {
  try {
    fs.appendFileSync(getLogFile(), formatted + '\n');
  } catch {
    // Silently fail — logging should never break the app
  }
  if (toStderr) {
    try { process.stderr.write(formatted + '\n'); } catch {}
  }
}

export function createLogger(component: string) {
  return {
    debug(message: string, data?: unknown): void {
      if (LEVELS[logLevel] <= LEVELS.debug) {
        writeLog(formatMessage('debug', component, message, data));
      }
    },
    info(message: string, data?: unknown): void {
      if (LEVELS[logLevel] <= LEVELS.info) {
        writeLog(formatMessage('info', component, message, data));
      }
    },
    warn(message: string, data?: unknown): void {
      if (LEVELS[logLevel] <= LEVELS.warn) {
        writeLog(formatMessage('warn', component, message, data), true);
      }
    },
    error(message: string, data?: unknown): void {
      if (LEVELS[logLevel] <= LEVELS.error) {
        writeLog(formatMessage('error', component, message, data), true);
      }
    },
  };
}

export function setLogLevel(level: LogLevel): void {
  logLevel = level;
}
