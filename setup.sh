#!/usr/bin/env bash
# Engram Setup — thin wrapper for Unix convenience.
# The real logic lives in setup.js (cross-platform).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/setup.js" "$@"
