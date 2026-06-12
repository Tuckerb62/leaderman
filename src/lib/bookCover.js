// Stable, contrast-safe book-cover palettes for the feed.
// Each cover is a deep "library leather" tone so cream text (var(--ink-light),
// #f7f0e4) sits well above WCAG AA contrast on the mid value, plus a warm gold
// hairline for the classic cover frame.
const BOOK_COVERS = [
  { top: '#3a1f1d', mid: '#5a2d29', bottom: '#1c0f0e', line: '#c9a86a' }, // oxblood
  { top: '#1f3328', mid: '#2e4a3a', bottom: '#101d16', line: '#bfa468' }, // forest
  { top: '#1d2a3a', mid: '#2b3f57', bottom: '#0f1722', line: '#b6a36b' }, // navy
  { top: '#2b1f36', mid: '#412f52', bottom: '#160f1d', line: '#bda572' }, // aubergine
  { top: '#16322f', mid: '#234c47', bottom: '#0c1c1a', line: '#bca772' }, // teal
  { top: '#2f2218', mid: '#4a3725', bottom: '#171009', line: '#c7a86a' }, // cocoa
  { top: '#26292e', mid: '#3a4048', bottom: '#131517', line: '#b3a079' }, // slate
  { top: '#321a28', mid: '#4c283d', bottom: '#180c13', line: '#c39a78' }, // plum
  { top: '#2c2c1c', mid: '#454529', bottom: '#15150d', line: '#c2b06a' }, // olive
];

export function getBookCover(seed) {
  const text = String(seed || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return BOOK_COVERS[Math.abs(hash) % BOOK_COVERS.length];
}
