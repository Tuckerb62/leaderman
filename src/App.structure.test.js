import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8');

describe('App markup structure', () => {
  it('does not put a save button inside the clickable novel row button', () => {
    const novelsView = appSource.slice(
      appSource.indexOf('function NovelsView'),
      appSource.indexOf('function NewsView'),
    );

    expect(novelsView).not.toMatch(/<button key=\{lesson\.id\}[\s\S]*?<button[\s\S]*?<\/button>[\s\S]*?<\/button>/);
  });
});
