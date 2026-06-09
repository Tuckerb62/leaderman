import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

function syncRootDir() {
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Leaderman');
  }
  return join(homedir(), '.leaderman');
}

export const SYNC_STATE_PATH = join(syncRootDir(), 'sync-state.json');

export async function readSyncState() {
  try {
    const raw = await readFile(SYNC_STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeSyncState(snapshot) {
  await mkdir(dirname(SYNC_STATE_PATH), { recursive: true });
  await writeFile(SYNC_STATE_PATH, JSON.stringify(snapshot, null, 2));
  return snapshot;
}
