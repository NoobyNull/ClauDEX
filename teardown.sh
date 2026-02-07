#!/usr/bin/env bash
# Engram Teardown — thin wrapper for Unix convenience.
# The real logic lives in teardown.js (cross-platform).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/teardown.js" "$@"
