#!/bin/bash

# =============================================================================
# MAIN COMMANDS - This script executes the following commands:
# =============================================================================
MAIN_COMMAND_1="anchor build"
MAIN_COMMAND_2="cargo build-sbf --manifest-path=./Cargo.toml --sbf-out-dir=target/deploy"
# =============================================================================

SCRIPT_NAME=$(basename "$0" .sh)
LOG_FILE="scripts/logs/${SCRIPT_NAME}.log"

mkdir -p scripts/logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting $SCRIPT_NAME script ==="

# Get version information
log "=== Version Information ==="
log "Anchor version: $(anchor --version 2>&1 || echo 'Not available')"
log "Rust version: $(rustc --version 2>&1 || echo 'Not available')"
log "Cargo version: $(cargo --version 2>&1 || echo 'Not available')"
log "Solana version: $(solana --version 2>&1 || echo 'Not available')"
log "Node version: $(node --version 2>&1 || echo 'Not available')"
log "NPM version: $(npm --version 2>&1 || echo 'Not available')"
log "Yarn version: $(yarn --version 2>&1 || echo 'Not available')"

eval "$MAIN_COMMAND_1"
if [ $? -ne 0 ]; then
    log "$MAIN_COMMAND_1 failed"
fi

eval "$MAIN_COMMAND_2"
if [ $? -ne 0 ]; then
    log "$MAIN_COMMAND_2 failed"
fi

log "=== $SCRIPT_NAME script completed ==="