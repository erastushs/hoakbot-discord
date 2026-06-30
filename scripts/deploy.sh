#!/usr/bin/env bash
set -Eeuo pipefail

echo "[deploy] $(date -u +'%Y-%m-%dT%H:%M:%SZ') — Starting deployment"

REPO_DIR="$HOME/hoakbot"
DEPLOY_DIR="$REPO_DIR/.deploy"
SLASH_HASH_FILE="$DEPLOY_DIR/slash.hash"
PACKAGE_LOCK="$REPO_DIR/package-lock.json"
PACKAGE_LOCK_HASH_FILE="$DEPLOY_DIR/package-lock.hash"

cd "$REPO_DIR"

echo "[deploy] Fetching latest from origin..."
git fetch origin main

echo "[deploy] Resetting to origin/main..."
git reset --hard origin/main

echo ""

# ── package-lock.json hash check ──────────────────────────────────────

mkdir -p "$DEPLOY_DIR"

CURRENT_PL_HASH=$(sha256sum "$PACKAGE_LOCK" | awk '{print $1}')
STORED_PL_HASH=""
if [ -f "$PACKAGE_LOCK_HASH_FILE" ]; then
  STORED_PL_HASH=$(cat "$PACKAGE_LOCK_HASH_FILE")
fi

if [ "$CURRENT_PL_HASH" != "$STORED_PL_HASH" ]; then
  echo "[deploy] package-lock.json changed — running npm ci"
  npm ci
  echo "$CURRENT_PL_HASH" > "$PACKAGE_LOCK_HASH_FILE"
else
  echo "[deploy] package-lock.json unchanged — skipping npm ci"
fi

echo ""

# ── Build ─────────────────────────────────────────────────────────────

echo "[deploy] Building..."
npm run build

echo ""

# ── Slash command optimization ────────────────────────────────────────

SLASH_HASH=$(find src/modules -path '*/commands/*.command.ts' -type f | sort | xargs sha256sum | sha256sum | awk '{print $1}')

STORED_SLASH_HASH=""
if [ -f "$SLASH_HASH_FILE" ]; then
  STORED_SLASH_HASH=$(cat "$SLASH_HASH_FILE")
fi

if [ "$SLASH_HASH" != "$STORED_SLASH_HASH" ]; then
  echo "[deploy] Slash commands changed — deploying..."
  npm run deploy:commands
  echo "$SLASH_HASH" > "$SLASH_HASH_FILE"
else
  echo "[deploy] Slash commands unchanged — skipping deployment"
fi

echo ""

# ── PM2 ───────────────────────────────────────────────────────────────

if pm2 jlist 2>/dev/null | grep -q '"name":"hoakbot"'; then
  echo "[deploy] PM2 process exists — restarting hoakbot"
  pm2 restart hoakbot
else
  echo "[deploy] PM2 process not found — starting hoakbot"
  pm2 start ecosystem.config.js
fi

echo ""

# ── PM2 status verification ───────────────────────────────────────────

sleep 2

STATUS=$(pm2 jlist 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const a=JSON.parse(d);const p=a.find(x=>x.name==='hoakbot');if(!p){console.log('MISSING');process.exit(1)}console.log(p.pm2_env.status)}catch(e){console.log('ERROR');process.exit(1)}})")

case "$STATUS" in
  online)
    echo "[deploy] hoakbot PM2 status: online ✓"
    ;;
  launching)
    echo "[deploy] hoakbot PM2 status: launching — check back shortly"
    ;;
  errored)
    echo "[deploy] hoakbot PM2 status: errored ✗"
    pm2 logs hoakbot --lines 20 --nostream
    exit 1
    ;;
  stopped)
    echo "[deploy] hoakbot PM2 status: stopped ✗"
    pm2 logs hoakbot --lines 20 --nostream
    exit 1
    ;;
  *)
    echo "[deploy] hoakbot PM2 status: $STATUS"
    ;;
esac

echo ""
echo "[deploy] $(date -u +'%Y-%m-%dT%H:%M:%SZ') — Deployment complete"
