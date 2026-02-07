/**
 * Process Watcher - Monitors Claude Code process and triggers shutdown
 * if Claude is no longer running.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createLogger } from '../shared/logger.js';

const execAsync = promisify(exec);
const log = createLogger('utils:process-watcher');

const CHECK_INTERVAL = 30000; // Check every 30 seconds
const SHUTDOWN_DELAY = 5 * 60 * 1000; // 5 minutes

let watcherInterval: NodeJS.Timeout | null = null;
let shutdownTimer: NodeJS.Timeout | null = null;
let isClaudeRunning = true;
let shutdownCallback: (() => void) | null = null;

/**
 * Check if Claude Code process is running
 */
async function isClaudeProcessRunning(): Promise<boolean> {
  try {
    // Method 1: Check parent process
    const ppid = process.ppid;
    if (ppid) {
      try {
        const { stdout } = await execAsync(`ps -p ${ppid} -o comm=`);
        const parentName = stdout.trim().toLowerCase();
        if (parentName.includes('claude') || parentName.includes('node')) {
          return true;
        }
      } catch {
        // Parent process not found
      }
    }

    // Method 2: Search for Claude Code process
    const { stdout } = await execAsync('ps aux | grep -i "claude" | grep -v grep || true');
    const processes = stdout.trim().split('\n').filter(line => line.length > 0);

    // Filter out this grep process and check for actual Claude processes
    const claudeProcesses = processes.filter(line => {
      const lower = line.toLowerCase();
      return (
        (lower.includes('claude') || lower.includes('claude-code')) &&
        !lower.includes('grep') &&
        !lower.includes('process-watcher')
      );
    });

    if (claudeProcesses.length > 0) {
      return true;
    }

    // Method 3: Check for Claude Code CLI in process tree
    try {
      const { stdout: pgrepOut } = await execAsync('pgrep -f "claude" || true');
      if (pgrepOut.trim().length > 0) {
        return true;
      }
    } catch {
      // pgrep not available or failed
    }

    return false;
  } catch (err) {
    log.warn('Error checking Claude process', err);
    return true; // Assume running on error to avoid false shutdowns
  }
}

/**
 * Start watching for Claude Code process
 */
export function startProcessWatcher(onShutdown: () => void): void {
  if (watcherInterval) {
    log.warn('Process watcher already running');
    return;
  }

  shutdownCallback = onShutdown;
  log.info('Starting Claude Code process watcher', {
    checkInterval: CHECK_INTERVAL,
    shutdownDelay: SHUTDOWN_DELAY,
  });

  watcherInterval = setInterval(async () => {
    log.debug('Checking Claude Code process status...');
    const running = await isClaudeProcessRunning();
    log.debug('Claude Code process check result', { running, wasRunning: isClaudeRunning });

    if (running && !isClaudeRunning) {
      // Claude came back online, cancel shutdown
      log.info('Claude Code process detected, canceling shutdown');
      isClaudeRunning = true;
      if (shutdownTimer) {
        clearTimeout(shutdownTimer);
        shutdownTimer = null;
      }
    } else if (!running && isClaudeRunning) {
      // Claude stopped, start shutdown timer
      log.warn('Claude Code process not found, scheduling shutdown in 5 minutes');
      isClaudeRunning = false;

      if (!shutdownTimer) {
        shutdownTimer = setTimeout(() => {
          log.info('Claude Code has been inactive for 5 minutes, shutting down Engram');
          stopProcessWatcher();
          if (shutdownCallback) {
            shutdownCallback();
          }
          process.exit(0);
        }, SHUTDOWN_DELAY);
      }
    } else if (running) {
      log.debug('Claude Code is running normally');
    } else {
      log.debug('Claude Code still not detected, shutdown timer active');
    }
  }, CHECK_INTERVAL);

  // Initial check
  isClaudeProcessRunning().then(running => {
    isClaudeRunning = running;
    if (!running) {
      log.warn('Claude Code process not found at startup, will shutdown in 5 minutes if not detected');
      shutdownTimer = setTimeout(() => {
        log.info('Claude Code inactive for 5 minutes, shutting down Engram');
        stopProcessWatcher();
        if (shutdownCallback) {
          shutdownCallback();
        }
        process.exit(0);
      }, SHUTDOWN_DELAY);
    }
  });
}

/**
 * Stop the process watcher
 */
export function stopProcessWatcher(): void {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
  }
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }
  log.info('Process watcher stopped');
}

/**
 * Check if the watcher is currently running
 */
export function isWatcherRunning(): boolean {
  return watcherInterval !== null;
}
