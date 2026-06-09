import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

let tempHome = '';

async function loadStoreModule() {
  tempHome = await mkdtemp(join(tmpdir(), 'leaderman-ai-settings-'));
  vi.stubEnv('HOME', tempHome);
  vi.resetModules();
  return import('./private-ai-settings-store.mjs');
}

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.resetModules();
  if (tempHome) {
    await rm(tempHome, { recursive: true, force: true });
    tempHome = '';
  }
});

describe('private AI settings store', () => {
  it('returns an empty object before the desktop settings file exists', async () => {
    const { AI_SETTINGS_PATH, readPrivateAiSettings } = await loadStoreModule();

    expect(AI_SETTINGS_PATH).toContain('Leaderman');
    expect(await readPrivateAiSettings()).toEqual({});
  });

  it('writes the desktop endpoint into the local app data folder', async () => {
    const { AI_SETTINGS_PATH, readPrivateAiSettings, writePrivateAiSettings } = await loadStoreModule();

    await writePrivateAiSettings({ endpoint: 'https://example.test/responses' });

    expect(await readPrivateAiSettings()).toEqual({
      endpoint: 'https://example.test/responses',
    });
    expect(JSON.parse(await readFile(AI_SETTINGS_PATH, 'utf8'))).toEqual({
      endpoint: 'https://example.test/responses',
    });
  });
});
