#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
#  ClauDEX Teardown Script
#  Clean uninstall of ClauDEX from Claude Code
# ═══════════════════════════════════════════════════════════════════
#
#  Usage:
#    ./teardown.sh             Unregister plugin, remove build artifacts
#    ./teardown.sh --purge     Also delete ~/.claudex (database + config)
#    ./teardown.sh --help      Show help
# ═══════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR"
CLAUDE_SETTINGS_DIR="${CLAUDE_SETTINGS_DIR:-$HOME/.claude}"
DATA_DIR="${CLAUDEX_DATA_DIR:-$HOME/.claudex}"
PURGE=false

# ── Colors ───────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
warn() { echo -e "  ${YELLOW}⚠${RESET} $*"; }
skip() { echo -e "  ${DIM}–${RESET} $*"; }
step() { echo -e "\n${CYAN}▸${RESET} ${BOLD}$*${RESET}"; }

# ── Parse args ───────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --purge)     PURGE=true ;;
    --help|-h)
      echo "ClauDEX Teardown"
      echo ""
      echo "Usage:"
      echo "  ./teardown.sh             Unregister + remove build artifacts"
      echo "  ./teardown.sh --purge     Also delete ~/.claudex (database, config, all data)"
      echo "  ./teardown.sh --help      Show this help"
      echo ""
      echo "Environment:"
      echo "  CLAUDEX_DATA_DIR          Override data directory (default: ~/.claudex)"
      echo "  CLAUDE_SETTINGS_DIR       Override Claude settings dir (default: ~/.claude)"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Run ./teardown.sh --help for usage."
      exit 1
      ;;
  esac
done

# ── Banner ───────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  ╔═══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}  ║  ${CYAN}Clau${YELLOW}DEX${RESET}${BOLD}  Teardown                    ║${RESET}"
if [ "$PURGE" = true ]; then
echo -e "${BOLD}  ║  ${RED}Full purge mode${RESET}${BOLD}                       ║${RESET}"
else
echo -e "${BOLD}  ║  Clean uninstall                      ║${RESET}"
fi
echo -e "${BOLD}  ╚═══════════════════════════════════════╝${RESET}"

# ─────────────────────────────────────────────────────────────────
# Confirmation
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "  This will:"
echo -e "    ${DIM}•${RESET} Remove plugin registration from Claude Code"
echo -e "    ${DIM}•${RESET} Delete dist/, node_modules/"
echo -e "    ${DIM}•${RESET} Remove generated hooks.json and .mcp.json"
if [ "$PURGE" = true ]; then
echo -e "    ${RED}•${RESET} ${RED}Delete ${DATA_DIR} (database + all saved memories)${RESET}"
fi
echo ""
read -rp "  Continue? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo -e "\n  ${DIM}Aborted.${RESET}\n"
  exit 0
fi

# ─────────────────────────────────────────────────────────────────
# PHASE 1: Unregister from Claude Code
# ─────────────────────────────────────────────────────────────────
step "Unregistering plugin from Claude Code..."

SETTINGS_LOCAL="$PLUGIN_DIR/.claude/settings.local.json"
if [ -f "$SETTINGS_LOCAL" ]; then
  # Remove the ClauDEX plugin entry from settings.local.json
  node --input-type=module -e "
    import fs from 'fs';
    const f = '${SETTINGS_LOCAL}';
    try {
      const cfg = JSON.parse(fs.readFileSync(f, 'utf-8'));
      if (cfg.plugins && Array.isArray(cfg.plugins)) {
        cfg.plugins = cfg.plugins.filter(p => p.path !== '${PLUGIN_DIR}');
        if (cfg.plugins.length === 0) delete cfg.plugins;
      }
      if (Object.keys(cfg).length === 0) {
        fs.unlinkSync(f);
        console.log('DELETED');
      } else {
        fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n');
        console.log('UPDATED');
      }
    } catch {
      console.log('SKIP');
    }
  " 2>/dev/null | while read -r result; do
    case "$result" in
      DELETED) ok "Removed settings.local.json (was only ClauDEX)" ;;
      UPDATED) ok "Removed ClauDEX entry from settings.local.json" ;;
      SKIP)    skip "settings.local.json not parseable, skipped" ;;
    esac
  done
else
  skip "No settings.local.json found"
fi

# ─────────────────────────────────────────────────────────────────
# PHASE 2: Stop web UI if running
# ─────────────────────────────────────────────────────────────────
step "Stopping web UI..."

WEB_PID=$(lsof -ti :37820 2>/dev/null || true)
if [ -n "$WEB_PID" ]; then
  kill "$WEB_PID" 2>/dev/null && ok "Killed web UI (PID $WEB_PID)" || skip "Could not kill PID $WEB_PID"
else
  skip "Web UI not running"
fi

# ─────────────────────────────────────────────────────────────────
# PHASE 3: Remove generated config files
# ─────────────────────────────────────────────────────────────────
step "Removing generated configuration..."

if [ -f "$PLUGIN_DIR/hooks/hooks.json" ]; then
  rm "$PLUGIN_DIR/hooks/hooks.json"
  ok "Removed hooks/hooks.json"
else
  skip "hooks/hooks.json not found"
fi

if [ -f "$PLUGIN_DIR/.mcp.json" ]; then
  rm "$PLUGIN_DIR/.mcp.json"
  ok "Removed .mcp.json"
else
  skip ".mcp.json not found"
fi

# ─────────────────────────────────────────────────────────────────
# PHASE 4: Remove build artifacts
# ─────────────────────────────────────────────────────────────────
step "Removing build artifacts..."

if [ -d "$PLUGIN_DIR/dist" ]; then
  rm -rf "$PLUGIN_DIR/dist"
  ok "Removed dist/"
else
  skip "dist/ not found"
fi

if [ -d "$PLUGIN_DIR/node_modules" ]; then
  rm -rf "$PLUGIN_DIR/node_modules"
  ok "Removed node_modules/"
else
  skip "node_modules/ not found"
fi

# ─────────────────────────────────────────────────────────────────
# PHASE 5: Purge data (optional)
# ─────────────────────────────────────────────────────────────────
if [ "$PURGE" = true ]; then
  step "Purging data directory..."

  if [ -d "$DATA_DIR" ]; then
    # Show what's being deleted
    DB_SIZE=$(du -sh "$DATA_DIR/claudex.db" 2>/dev/null | cut -f1 || echo "0")
    TOTAL_SIZE=$(du -sh "$DATA_DIR" 2>/dev/null | cut -f1 || echo "0")
    echo -e "    ${DIM}Database: ${DB_SIZE}${RESET}"
    echo -e "    ${DIM}Total:    ${TOTAL_SIZE}${RESET}"
    echo ""
    read -rp "  Delete ${DATA_DIR} permanently? [y/N] " purge_confirm
    if [[ "$purge_confirm" =~ ^[Yy]$ ]]; then
      rm -rf "$DATA_DIR"
      ok "Deleted ${DATA_DIR}"
    else
      skip "Kept ${DATA_DIR}"
    fi
  else
    skip "${DATA_DIR} not found"
  fi
fi

# ─────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  ╔═══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}  ║  ${GREEN}✓${RESET}${BOLD}  ClauDEX has been removed.          ║${RESET}"
echo -e "${BOLD}  ╚═══════════════════════════════════════╝${RESET}"
echo ""

if [ "$PURGE" = false ]; then
  echo -e "  ${DIM}Your data is still at ${DATA_DIR}${RESET}"
  echo -e "  ${DIM}To delete it too, re-run: ./teardown.sh --purge${RESET}"
  echo ""
fi

echo -e "  ${DIM}To reinstall: ./setup.sh${RESET}"
echo ""
