const BOOK_PALETTES = [
  ['#4b3a2a', '#6d563c', '#241b14', '#c0aa74'],
  ['#39463a', '#58664f', '#1f281f', '#b9a66f'],
  ['#3b434f', '#566173', '#1e2630', '#b9a66f'],
  ['#4b3538', '#6b5054', '#24181a', '#bea572'],
  ['#4a4437', '#67604f', '#28251e', '#bca772'],
  ['#3f3b47', '#5b5668', '#24212b', '#bca772'],
  ['#3d4848', '#586969', '#202929', '#bca772'],
  ['#5a4934', '#78664a', '#2c251b', '#bda56d'],
  ['#454034', '#625b49', '#25231d', '#bda56d'],
];

export function getStableBookPalette(seed) {
  const text = String(seed || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return BOOK_PALETTES[Math.abs(hash) % BOOK_PALETTES.length];
}

export function splitIntoBookPages(text, target = 1150, tolerance = 50) {
  const normalized = String(text || '').trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const pages = [];
  let current = '';

  function pushCurrent() {
    if (current.trim()) pages.push(current.trim());
    current = '';
  }

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= target + tolerance) {
      current = candidate;
      continue;
    }

    if (current.length >= target - tolerance) {
      pushCurrent();
    }

    if (paragraph.length <= target + tolerance) {
      current = paragraph;
      continue;
    }

    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const next = current ? `${current} ${sentence}` : sentence;

      if (next.length <= target + tolerance) {
        current = next;
      } else {
        pushCurrent();

        if (sentence.length > target + tolerance) {
          const words = sentence.split(/\s+/);
          let wordChunk = '';

          for (const word of words) {
            const wordNext = wordChunk ? `${wordChunk} ${word}` : word;

            if (wordNext.length <= target + tolerance) {
              wordChunk = wordNext;
            } else {
              if (wordChunk) pages.push(wordChunk);
              wordChunk = word;
            }
          }

          current = wordChunk;
        } else {
          current = sentence;
        }
      }
    }
  }

  pushCurrent();

  if (pages.length >= 2) {
    const last = pages[pages.length - 1];
    const prev = pages[pages.length - 2];
    if (last.length < Math.floor(target * 0.35) && prev.length + 2 + last.length <= target + tolerance * 4) {
      pages.splice(pages.length - 2, 2, `${prev}\n\n${last}`);
    }
  }

  return pages;
}

export function splitFeedPreview(text, limit = 190) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}…`;
}
