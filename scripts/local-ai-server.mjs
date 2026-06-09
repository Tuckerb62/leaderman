import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { networkInterfaces, userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildPrivateNewsBriefing, expandPrivateNewsStory } from './private-news.mjs';
import { AI_SETTINGS_PATH, readPrivateAiSettings, writePrivateAiSettings } from './private-ai-settings-store.mjs';
import { readSyncState, SYNC_STATE_PATH, writeSyncState } from './private-sync-store.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST_DIR = join(ROOT, 'dist');
const SERVICE_NAME = 'leaderman-openai-key';
const DEFAULT_PORT = Number(process.env.PORT || 4174);
const DEFAULT_UPSTREAM_ENDPOINT = 'https://api.openai.com/v1/responses';

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const host = argValue('--host', process.env.HOST || '127.0.0.1');
const port = Number(argValue('--port', DEFAULT_PORT));

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function serverUrls() {
  return {
    localUrl: `http://127.0.0.1:${port}/`,
    phoneUrls: host === '0.0.0.0' ? lanAddresses().map((address) => `http://${address}:${port}/`) : [],
    hostMode: host === '0.0.0.0' ? 'lan' : 'local',
  };
}

function isLoopbackRequest(req) {
  const remoteAddress = req.socket.remoteAddress || '';
  return remoteAddress === '127.0.0.1'
    || remoteAddress === '::1'
    || remoteAddress === '::ffff:127.0.0.1';
}

function keyFromKeychain() {
  if (process.platform !== 'darwin') return '';
  try {
    return execFileSync('/usr/bin/security', [
      'find-generic-password',
      '-a',
      userInfo().username,
      '-s',
      SERVICE_NAME,
      '-w',
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function saveKeyToKeychain(apiKey) {
  if (process.platform !== 'darwin') {
    throw new Error('macOS Keychain saving is only available on macOS.');
  }
  execFileSync('/usr/bin/security', [
    'add-generic-password',
    '-a',
    userInfo().username,
    '-s',
    SERVICE_NAME,
    '-w',
    apiKey,
    '-U',
  ], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
}

function getApiKey() {
  const envKey = process.env.OPENAI_API_KEY?.trim();
  if (envKey) return { key: envKey, source: 'environment' };
  const keychainKey = keyFromKeychain();
  if (keychainKey) return { key: keychainKey, source: 'macOS Keychain' };
  return { key: '', source: 'missing' };
}

async function getPrivateAiSettings() {
  const settings = await readPrivateAiSettings();
  const endpoint = String(settings.endpoint || '').trim();
  return {
    endpoint: endpoint || DEFAULT_UPSTREAM_ENDPOINT,
    hasCustomEndpoint: Boolean(endpoint && endpoint !== DEFAULT_UPSTREAM_ENDPOINT),
  };
}

function json(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

async function proxyOpenAI(req, res) {
  const { key, source } = getApiKey();
  if (!key) {
    json(res, 503, {
      error: {
        message: `No OpenAI API key found. Run npm run keychain:set, or start with OPENAI_API_KEY=... npm run local:ai.`,
      },
    });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    json(res, 400, { error: { message: error.message } });
    return;
  }

  const privateAiSettings = await getPrivateAiSettings();
  const upstream = await fetch(privateAiSettings.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  res.writeHead(upstream.status, {
    'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    'X-Leaderman-Key-Source': source,
  });
  res.end(text);
}

async function syncHealth(req, res) {
  const snapshot = await readSyncState();
  const urls = serverUrls();
  json(res, 200, {
    available: true,
    path: SYNC_STATE_PATH,
    updatedAt: snapshot?.syncedAt || null,
    localUrl: urls.localUrl,
    phoneUrls: urls.phoneUrls,
    hostMode: urls.hostMode,
    canSaveKeychain: isLoopbackRequest(req),
  });
}

async function getSyncState(res) {
  const snapshot = await readSyncState();
  json(res, 200, {
    snapshot,
  });
}

async function saveSyncState(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    json(res, 400, { error: { message: error.message } });
    return;
  }

  const snapshot = body?.snapshot;
  if (!snapshot?.syncedAt) {
    json(res, 400, { error: { message: 'Sync snapshot is missing syncedAt.' } });
    return;
  }

  const existing = await readSyncState();
  const nextSnapshot = !existing || snapshot.syncedAt >= existing.syncedAt ? snapshot : existing;
  await writeSyncState(nextSnapshot);
  json(res, 200, { snapshot: nextSnapshot });
}

async function refreshPrivateNews(req, res) {
  let body = {};
  try {
    body = await readJson(req);
  } catch (error) {
    json(res, 400, { error: { message: error.message } });
    return;
  }

  const { key } = getApiKey();
  const apiKey = String(body?.apiKey || '').trim() || key || '';
  const briefing = await buildPrivateNewsBriefing({ apiKey });
  json(res, 200, briefing);
}

async function expandPrivateNews(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    json(res, 400, { error: { message: error.message } });
    return;
  }

  const story = body?.story;
  if (!story?.title) {
    json(res, 400, { error: { message: 'A compact news story is required.' } });
    return;
  }

  const { key } = getApiKey();
  const apiKey = String(body?.apiKey || '').trim() || key || '';
  if (!apiKey) {
    json(res, 503, {
      error: {
        message: 'No OpenAI API key found for private news expansion.',
      },
    });
    return;
  }

  const markdown = await expandPrivateNewsStory({ story, apiKey });
  json(res, 200, { markdown });
}

async function saveOpenAIKey(req, res) {
  if (!isLoopbackRequest(req)) {
    json(res, 403, {
      error: {
        message: 'Save the API key from the Curiosity app on your Mac itself, not from another device.',
      },
    });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    json(res, 400, { error: { message: error.message } });
    return;
  }

  const apiKey = String(body.apiKey || '').trim();
  if (!apiKey) {
    json(res, 400, { error: { message: 'No API key was provided.' } });
    return;
  }

  try {
    saveKeyToKeychain(apiKey);
    json(res, 200, { ok: true, source: 'macOS Keychain' });
  } catch (error) {
    json(res, 500, { error: { message: error.message || 'Could not save key to Keychain.' } });
  }
}

async function desktopAiSettingsHealth(req, res) {
  if (!isLoopbackRequest(req)) {
    json(res, 403, {
      error: {
        message: 'Desktop AI settings are only available from the Curiosity app on your Mac itself.',
      },
    });
    return;
  }

  const privateAiSettings = await getPrivateAiSettings();
  json(res, 200, {
    canSaveDesktopSettings: true,
    settingsPath: AI_SETTINGS_PATH,
    endpoint: privateAiSettings.endpoint,
    hasCustomEndpoint: privateAiSettings.hasCustomEndpoint,
  });
}

async function saveDesktopAiSettings(req, res) {
  if (!isLoopbackRequest(req)) {
    json(res, 403, {
      error: {
        message: 'Save the AI endpoint from the Curiosity app on your Mac itself, not from another device.',
      },
    });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    json(res, 400, { error: { message: error.message } });
    return;
  }

  const endpoint = String(body.endpoint || '').trim();
  if (!endpoint) {
    await writePrivateAiSettings({});
    json(res, 200, { ok: true, endpoint: DEFAULT_UPSTREAM_ENDPOINT, hasCustomEndpoint: false });
    return;
  }

  if (!/^https?:\/\//i.test(endpoint)) {
    json(res, 400, { error: { message: 'The desktop AI endpoint must be a full http or https URL.' } });
    return;
  }

  await writePrivateAiSettings({ endpoint });
  json(res, 200, { ok: true, endpoint, hasCustomEndpoint: endpoint !== DEFAULT_UPSTREAM_ENDPOINT });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(DIST_DIR, safePath);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(DIST_DIR, 'index.html');
  }

  try {
    await stat(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url?.startsWith('/api/ai-health')) {
      const { key, source } = getApiKey();
      const urls = serverUrls();
      const privateAiSettings = await getPrivateAiSettings();
      json(res, 200, {
        keyConfigured: Boolean(key),
        source: key ? source : 'missing',
        canSaveKeychain: isLoopbackRequest(req),
        canSaveDesktopSettings: isLoopbackRequest(req),
        desktopAiEndpoint: isLoopbackRequest(req) ? privateAiSettings.endpoint : '',
        hasCustomDesktopEndpoint: isLoopbackRequest(req) ? privateAiSettings.hasCustomEndpoint : false,
        desktopSettingsPath: isLoopbackRequest(req) ? AI_SETTINGS_PATH : '',
        localUrl: urls.localUrl,
        phoneUrls: urls.phoneUrls,
        hostMode: urls.hostMode,
        capabilities: {
          sync: true,
          news: true,
          newsExpand: true,
        },
      });
      return;
    }
    if (req.method === 'GET' && req.url?.startsWith('/api/desktop-ai-settings')) {
      await desktopAiSettingsHealth(req, res);
      return;
    }
    if (req.method === 'GET' && req.url?.startsWith('/api/sync-health')) {
      await syncHealth(req, res);
      return;
    }
    if (req.method === 'GET' && req.url?.startsWith('/api/sync-state')) {
      await getSyncState(res);
      return;
    }
    if (req.method === 'POST' && req.url?.startsWith('/api/sync-state')) {
      await saveSyncState(req, res);
      return;
    }
    if (req.method === 'POST' && req.url?.startsWith('/api/openai-responses')) {
      await proxyOpenAI(req, res);
      return;
    }
    if (req.method === 'POST' && req.url?.startsWith('/api/news-refresh')) {
      await refreshPrivateNews(req, res);
      return;
    }
    if (req.method === 'POST' && req.url?.startsWith('/api/news-expand')) {
      await expandPrivateNews(req, res);
      return;
    }
    if (req.method === 'POST' && req.url?.startsWith('/api/save-openai-key')) {
      await saveOpenAIKey(req, res);
      return;
    }
    if (req.method === 'POST' && req.url?.startsWith('/api/desktop-ai-settings')) {
      await saveDesktopAiSettings(req, res);
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      await serveStatic(req, res);
      return;
    }
    res.writeHead(405);
    res.end('Method not allowed');
  } catch (error) {
    json(res, 500, { error: { message: error.message || 'Server error.' } });
  }
});

try {
  await readFile(join(DIST_DIR, 'index.html'));
} catch {
  console.error('dist/index.html was not found. Run npm run build first.');
  process.exit(1);
}

server.listen(port, host, () => {
  const keyInfo = getApiKey();
  console.log(`Curiosity private AI server running at http://${host}:${port}/`);
  if (host === '0.0.0.0') {
    for (const address of lanAddresses()) {
      console.log(`Phone URL: http://${address}:${port}/`);
    }
  }
  console.log(`API key: ${keyInfo.key ? `loaded from ${keyInfo.source}` : 'missing'}`);
});
