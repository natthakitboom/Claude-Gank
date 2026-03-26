#!/bin/bash
# ============================================================
# Claude Team Gang — Installer
# ============================================================
set -e

REPO_URL="https://github.com/natthakitboom/Claude-Gank.git"
INSTALL_DIR="$HOME/Claude Team Gang"
APP_DIR="$INSTALL_DIR"   # repo root IS the app (no subdirectory)
LAUNCH_AGENT_PLIST="$HOME/Library/LaunchAgents/com.claudegang.app.plist"
APP_PORT=3000
LOG_FILE="$HOME/Library/Logs/claude-gang.log"
ERR_LOG="$HOME/Library/Logs/claude-gang-error.log"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[GANG]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC}  $1"; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     Claude Team Gang — Installer     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Homebrew ──────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  log "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon
  if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
  fi
  ok "Homebrew installed"
else
  ok "Homebrew พร้อม"
fi

# ── 2. Node.js ───────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  log "Installing Node.js 22..."
  brew install node@22
  brew link node@22 --force
  ok "Node.js installed"
else
  NODE_VER=$(node --version)
  ok "Node.js พร้อม ($NODE_VER)"
fi

# ── 3. Git ───────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  log "Installing Git..."
  brew install git
  ok "Git installed"
else
  ok "Git พร้อม"
fi

# ── 4. Docker ────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  warn "Docker Desktop ยังไม่ได้ติดตั้ง"
  echo ""
  echo "  กรุณาติดตั้ง Docker Desktop จาก:"
  echo "  https://www.docker.com/products/docker-desktop/"
  echo ""
  open "https://www.docker.com/products/docker-desktop/" 2>/dev/null || true
  read -p "  กด Enter เมื่อติดตั้ง Docker Desktop เรียบร้อยแล้ว..."
  echo ""
else
  ok "Docker พร้อม"
fi

# ── 5. Claude CLI ────────────────────────────────────────────
if ! command -v claude &>/dev/null; then
  log "Installing Claude CLI..."
  npm install -g @anthropic-ai/claude-code
  ok "Claude CLI installed"
else
  CLAUDE_VER=$(claude --version 2>/dev/null || echo "unknown")
  ok "Claude CLI พร้อม ($CLAUDE_VER)"
fi

# ── 6. Clone / Update repo ───────────────────────────────────
if [ -d "$APP_DIR" ]; then
  log "อัปเดต code จาก GitHub..."
  cd "$APP_DIR"
  git pull origin main
  ok "Code อัปเดตแล้ว"
else
  log "Clone repository ไปที่ $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  ok "Clone สำเร็จ"
fi

# ── 7. Install dependencies + Build ─────────────────────────
log "ติดตั้ง dependencies..."
cd "$APP_DIR"
npm install
ok "Dependencies installed"

log "Build production app..."
npm run build
ok "Build สำเร็จ"

# ── 8. Init database ─────────────────────────────────────────
mkdir -p "$APP_DIR/data"
if [ ! -f "$APP_DIR/data/agents.db" ]; then
  log "สร้าง database..."
  node scripts/init-db.js 2>/dev/null || true
  ok "Database พร้อม"
else
  ok "Database มีอยู่แล้ว (ข้อมูลเดิมยังอยู่)"
fi

# Find Node.js binary path
NODE_BIN=$(which node)
NEXT_BIN="$APP_DIR/node_modules/.bin/next"

# ── 9. LaunchAgent (auto-start on login) ─────────────────────
log "ตั้งค่า auto-start (LaunchAgent)..."
mkdir -p "$(dirname "$LAUNCH_AGENT_PLIST")"

cat > "$LAUNCH_AGENT_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claudegang.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_BIN</string>
        <string>$NEXT_BIN</string>
        <string>start</string>
        <string>-p</string>
        <string>$APP_PORT</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$APP_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_FILE</string>
    <key>StandardErrorPath</key>
    <string>$ERR_LOG</string>
</dict>
</plist>
EOF

# Load LaunchAgent
launchctl unload "$LAUNCH_AGENT_PLIST" 2>/dev/null || true
launchctl load "$LAUNCH_AGENT_PLIST"
ok "LaunchAgent ตั้งค่าแล้ว (auto-start เมื่อ login)"

# ── 10. Install launcher .app to /Applications ───────────────
APP_BUNDLE="/Applications/Claude Team Gang.app"
MACOS_DIR="$APP_BUNDLE/Contents/MacOS"
RES_DIR="$APP_BUNDLE/Contents/Resources"
mkdir -p "$MACOS_DIR" "$RES_DIR"

# Copy icon if available
ICON_SRC="$APP_DIR/installer/AppIcon.icns"
if [ -f "$ICON_SRC" ]; then
  cp "$ICON_SRC" "$RES_DIR/AppIcon.icns"
fi

cat > "$APP_BUNDLE/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Claude Team Gang</string>
    <key>CFBundleIdentifier</key>
    <string>com.claudegang.app.launcher</string>
    <key>CFBundleName</key>
    <string>Claude Team Gang</string>
    <key>CFBundleDisplayName</key>
    <string>Claude Team Gang</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

cat > "$MACOS_DIR/Claude Team Gang" << LAUNCHER
#!/bin/bash
# Wait for server to be ready, then open browser
for i in \$(seq 1 15); do
  if curl -s "http://localhost:$APP_PORT" > /dev/null 2>&1; then
    open "http://localhost:$APP_PORT"
    exit 0
  fi
  sleep 1
done
# Server not ready yet — open anyway
open "http://localhost:$APP_PORT"
LAUNCHER

chmod +x "$MACOS_DIR/Claude Team Gang"
ok "ติดตั้ง Claude Team Gang.app ใน /Applications แล้ว"

# ── Done! ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║         ✅ ติดตั้งสำเร็จ!            ║"
echo "╠══════════════════════════════════════╣"
echo "║  🌐 http://localhost:$APP_PORT             ║"
echo "║  📂 $INSTALL_DIR  ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  ขั้นตอนต่อไป:"
echo "  1. เปิด Claude Team Gang.app จาก /Applications"
echo "  2. ตั้งค่า Claude CLI path ใน System → System Info"
echo "  3. รัน: claude auth  (login ครั้งแรก)"
echo ""

sleep 2
open "http://localhost:$APP_PORT" 2>/dev/null || true
