import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

function aiSettingsRootDir() {
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Leaderman');
  }
  return join(homedir(), '.leaderman');
}

export const AI_SETTINGS_PATH = join(aiSettingsRootDir(), 'ai-settings.json');

export async function readPrivateAiSettings() {
  try {
    const raw = await readFile(AI_SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function writePrivateAiSettings(settings) {
  await mkdir(dirname(AI_SETTINGS_PATH), { recursive: true });
  await writeFile(AI_SETTINGS_PATH, JSON.stringify(settings, null, 2));
  return settings;
}
