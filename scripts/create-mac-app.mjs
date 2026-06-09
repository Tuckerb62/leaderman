import { execFileSync } from 'node:child_process';
import { chmod, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const APP_NAME = 'Curiosity';
const BUNDLE_ID = 'com.leaderman.local';
const targetArgIndex = process.argv.indexOf('--target');
const targetDir = targetArgIndex === -1 ? join(process.env.HOME, 'Desktop') : resolve(process.argv[targetArgIndex + 1]);
const appPath = join(targetDir, `${APP_NAME}.app`);
const contentsDir = join(appPath, 'Contents');
const macosDir = join(contentsDir, 'MacOS');
const resourcesDir = join(contentsDir, 'Resources');
const tempDir = join(ROOT, '.tmp-mac-app');

function run(command, args) {
  execFileSync(command, args, { stdio: ['ignore', 'ignore', 'ignore'] });
}

async function buildIcon() {
  const thumbnailDir = join(tempDir, 'thumbnail');
  const iconsetDir = join(tempDir, 'Curiosity.iconset');
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(thumbnailDir, { recursive: true });
  await mkdir(iconsetDir, { recursive: true });

  run('/usr/bin/qlmanage', ['-t', '-s', '1024', '-o', thumbnailDir, join(ROOT, 'public', 'icon.svg')]);

  const sourcePng = join(thumbnailDir, 'icon.svg.png');
  const sizes = [
    ['16', 'icon_16x16.png'],
    ['32', 'icon_16x16@2x.png'],
    ['32', 'icon_32x32.png'],
    ['64', 'icon_32x32@2x.png'],
    ['128', 'icon_128x128.png'],
    ['256', 'icon_128x128@2x.png'],
    ['256', 'icon_256x256.png'],
    ['512', 'icon_256x256@2x.png'],
    ['512', 'icon_512x512.png'],
    ['1024', 'icon_512x512@2x.png'],
  ];

  for (const [size, name] of sizes) {
    run('/usr/bin/sips', ['-z', size, size, sourcePng, '--out', join(iconsetDir, name)]);
  }

  run('/usr/bin/iconutil', ['-c', 'icns', iconsetDir, '-o', join(resourcesDir, 'Curiosity.icns')]);
}

const launcher = `#!/bin/zsh
set -u

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

PROJECT_DIR="${ROOT}"
PORT="4174"
URL="http://127.0.0.1:\${PORT}/"
LOG_DIR="$HOME/Library/Logs/Curiosity"
LOG_FILE="$LOG_DIR/launcher.log"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR" || exit 1

notify() {
  /usr/bin/osascript -e "display notification \\"$1\\" with title \\"Curiosity\\"" >/dev/null 2>&1 || true
}

fail() {
  /usr/bin/osascript -e "display alert \\"Curiosity could not start\\" message \\"$1\\" as warning" >/dev/null 2>&1 || true
  exit 1
}

server_ready() {
  /usr/bin/curl -fsS "http://127.0.0.1:\${PORT}/api/ai-health" >/dev/null 2>&1 || return 1
  /usr/bin/curl -fsS "http://127.0.0.1:\${PORT}/api/sync-health" >/dev/null 2>&1 || return 1
}

restart_stale_server() {
  local pid
  pid=$(/usr/sbin/lsof -ti tcp:"$PORT" 2>/dev/null | head -n 1 || true)
  if [[ -n "$pid" ]]; then
    /bin/kill "$pid" >/dev/null 2>&1 || true
    sleep 0.4
  fi
}

if ! command -v npm >/dev/null 2>&1; then
  fail "npm was not found. Open Terminal, run cd ${ROOT} && npm install, then try again."
fi

if server_ready; then
  /usr/bin/open "$URL"
  exit 0
fi

if /usr/bin/curl -fsS "http://127.0.0.1:\${PORT}/api/ai-health" >/dev/null 2>&1; then
  notify "Restarting outdated private server..."
  restart_stale_server
fi

notify "Starting private app server..."

{
  echo ""
  echo "---- $(date) ----"
  npm run build
  nohup node scripts/local-ai-server.mjs --host 0.0.0.0 --port "$PORT" >> "$LOG_FILE" 2>&1 &
} >> "$LOG_FILE" 2>&1

for attempt in {1..40}; do
  if server_ready; then
    /usr/bin/open "$URL"
    exit 0
  fi
  sleep 0.25
done

fail "The private server did not become ready. Check $LOG_FILE."
`;

const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleExecutable</key>
  <string>${APP_NAME}</string>
  <key>CFBundleIconFile</key>
  <string>Curiosity</string>
  <key>CFBundleIdentifier</key>
  <string>${BUNDLE_ID}</string>
  <key>CFBundleName</key>
  <string>${APP_NAME}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`;

await mkdir(targetDir, { recursive: true });
await rm(appPath, { recursive: true, force: true });
await mkdir(macosDir, { recursive: true });
await mkdir(resourcesDir, { recursive: true });
await writeFile(join(contentsDir, 'Info.plist'), infoPlist);
await writeFile(join(macosDir, APP_NAME), launcher);
await chmod(join(macosDir, APP_NAME), 0o755);
await buildIcon();
await rm(tempDir, { recursive: true, force: true });

console.log(`Created ${appPath}`);
