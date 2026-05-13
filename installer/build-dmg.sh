#!/bin/bash
# ============================================================
# Build Claude Team Gang.dmg
# Run this on your Mac from: installer/ directory
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/dist"
STAGING_DIR="$SCRIPT_DIR/_dmg_staging"
DMG_NAME="Claude Team Gang"
DMG_OUTPUT="$OUTPUT_DIR/${DMG_NAME}.dmg"
VOLUME_NAME="Claude Team Gang"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[DMG]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}  $1"; }

mkdir -p "$OUTPUT_DIR"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# ── 1. Build "Install Claude Team Gang.app" ──────────────────
log "Building installer .app..."
APP_BUNDLE="$STAGING_DIR/Install Claude Team Gang.app"
MACOS_DIR="$APP_BUNDLE/Contents/MacOS"
RES_DIR="$APP_BUNDLE/Contents/Resources"
mkdir -p "$MACOS_DIR" "$RES_DIR"

# Info.plist
cat > "$APP_BUNDLE/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Install Claude Team Gang</string>
    <key>CFBundleIdentifier</key>
    <string>com.claudegang.installer</string>
    <key>CFBundleName</key>
    <string>Install Claude Team Gang</string>
    <key>CFBundleDisplayName</key>
    <string>Install Claude Team Gang</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Copy install.sh to Resources
cp "$SCRIPT_DIR/install.sh" "$RES_DIR/install.sh"
chmod +x "$RES_DIR/install.sh"

# Copy icon
if [ -f "$SCRIPT_DIR/AppIcon.icns" ]; then
  cp "$SCRIPT_DIR/AppIcon.icns" "$RES_DIR/AppIcon.icns"
fi

# Launcher executable — opens Terminal and runs install.sh
cat > "$MACOS_DIR/Install Claude Team Gang" << 'LAUNCHER'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_SH="$SCRIPT_DIR/../Resources/install.sh"
chmod +x "$INSTALL_SH"
osascript -e "tell application \"Terminal\"
  activate
  do script \"clear; bash '$INSTALL_SH'; echo ''; read -p \\\"กด Enter เพื่อปิด...\\\"; exit\"
end tell"
LAUNCHER
chmod +x "$MACOS_DIR/Install Claude Team Gang"
ok "Installer .app built"

# ── 2. README.txt ─────────────────────────────────────────────
cat > "$STAGING_DIR/README.txt" << 'README'
╔══════════════════════════════════════╗
║     Claude Team Gang — Installer    ║
╚══════════════════════════════════════╝

วิธีติดตั้ง:
1. ดับเบิลคลิก "Install Claude Team Gang.app"
2. รอ Terminal ทำงานจนเสร็จ (~5-10 นาที)
3. เปิดเบราว์เซอร์ที่ http://localhost:3000

สิ่งที่จะถูกติดตั้งอัตโนมัติ:
✓ Homebrew
✓ Node.js 22
✓ Git
✓ Claude CLI
✓ Claude Team Gang app

* Docker Desktop ต้องติดตั้งเองจาก docker.com
* หลังติดตั้ง ให้รัน: claude auth

README

# ── 3. Create DMG ─────────────────────────────────────────────
log "Creating .dmg..."
rm -f "$DMG_OUTPUT"
hdiutil create \
  -srcfolder "$STAGING_DIR" \
  -volname "$VOLUME_NAME" \
  -fs HFS+ \
  -format UDZO \
  -imagekey zlib-level=9 \
  -o "$DMG_OUTPUT"

# Cleanup
rm -rf "$STAGING_DIR"

ok "DMG created: $DMG_OUTPUT"
echo ""
echo "  $(du -sh "$DMG_OUTPUT" | cut -f1)  ${DMG_OUTPUT}"
echo ""
echo "  แจกจ่าย: ${DMG_NAME}.dmg"
