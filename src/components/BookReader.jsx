import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Type } from 'lucide-react';
import { clampPageIndex } from '../logic/lessonPages.js';

export const DEFAULT_READER_SETTINGS = {
  theme: 'paper',
  fontScale: 1,
};

const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.3;
const FONT_SCALE_STEP = 0.075;

export function renderMarkdownInline(text = '') {
  const source = String(text);
  const pattern = /\*\*(.+?)\*\*/g;
  const nodes = [];
  let cursor = 0;
  let match;
  let index = 0;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > cursor) {
      nodes.push(source.slice(cursor, match.index));
    }
    nodes.push(<strong key={`bold-${index}`}>{match[1]}</strong>);
    index += 1;
    cursor = pattern.lastIndex;
  }

  if (!nodes.length) return source;
  if (cursor < source.length) nodes.push(source.slice(cursor));
  return nodes;
}

export function MarkdownBlock({ markdown = '' }) {
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (listItems.length) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  }

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      continue;
    }
    flushList();
    blocks.push({ type: 'paragraph', text: line });
  }
  flushList();

  return (
    <div className="article-body markdown-body">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4';
          return <Tag key={`${block.type}-${index}`}>{renderMarkdownInline(block.text)}</Tag>;
        }
        if (block.type === 'list') {
          return (
            <ul key={`${block.type}-${index}`}>
              {block.items.map((item) => <li key={item}>{renderMarkdownInline(item)}</li>)}
            </ul>
          );
        }
        return <p key={`${block.type}-${index}`}>{renderMarkdownInline(block.text)}</p>;
      })}
    </div>
  );
}

function isTypingTarget(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable]'));
}

export function BookReader({
  bookKey,
  kicker = '',
  title,
  pages = [],
  position = 0,
  onPosition,
  completed = false,
  onComplete,
  completeLabel = 'Finished',
  readerSettings,
  onReaderSettings,
  footer = null,
  onGenerate = null,
  isGenerating = false,
}) {
  const settings = { ...DEFAULT_READER_SETTINGS, ...(readerSettings || {}) };
  const [pageIndex, setPageIndex] = useState(() => clampPageIndex(pages, position));
  const [settingsOpen, setSettingsOpen] = useState(false);
  // True once the reader has asked for the next page that isn't written yet:
  // it shows the typing indicator and auto-advances the moment that page lands.
  const [pendingNext, setPendingNext] = useState(false);

  useEffect(() => {
    setPageIndex(clampPageIndex(pages, position));
    setSettingsOpen(false);
    setPendingNext(false);
    // position is intentionally read only when the book changes: while reading,
    // the local page index leads and saved position follows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey]);

  const pageCount = pages.length;
  const safeIndex = clampPageIndex(pages, pageIndex);
  const isLastPage = safeIndex >= pageCount - 1;
  const canGenerate = typeof onGenerate === 'function';
  const waitingForNextPage = isLastPage && (isGenerating || pendingNext);

  function goToPage(nextIndex) {
    const clamped = clampPageIndex(pages, nextIndex);
    if (clamped === safeIndex) return;
    setPageIndex(clamped);
    onPosition?.(clamped);
  }

  // Advance / generate. On a written page, just turn it. On the last written
  // page, kick off generation (or wait for the page still streaming in).
  function goNext() {
    if (safeIndex < pageCount - 1) {
      goToPage(safeIndex + 1);
      return;
    }
    if (canGenerate && !isGenerating) {
      setPendingNext(true);
      onGenerate();
      return;
    }
    if (isGenerating) {
      setPendingNext(true);
    }
  }

  // When the page we were waiting on arrives, turn to it.
  useEffect(() => {
    if (!pendingNext) return;
    if (safeIndex < pageCount - 1) {
      goToPage(safeIndex + 1);
      setPendingNext(false);
    } else if (!isGenerating && !canGenerate) {
      setPendingNext(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, isGenerating, pendingNext]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goToPage(safeIndex - 1);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function adjustFontScale(direction) {
    const next = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, settings.fontScale + direction * FONT_SCALE_STEP));
    onReaderSettings?.({ fontScale: Number(next.toFixed(3)) });
  }

  if (pageCount === 0) {
    return (
      <div className={`book-reader theme-${settings.theme}`}>
        <div className="book-page">
          <h1 className="book-title">{title}</h1>
          <p className="book-empty">This one has no pages yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`book-reader theme-${settings.theme}`} style={{ '--book-font-scale': settings.fontScale }}>
      <div className="book-toolbar">
        <span className="book-kicker">{kicker}</span>
        <button
          className={settingsOpen ? 'book-tool-button active' : 'book-tool-button'}
          onClick={() => setSettingsOpen((current) => !current)}
          aria-label="Reading settings"
        >
          <Type size={15} />
        </button>
      </div>

      {settingsOpen && (
        <div className="book-settings">
          <div className="book-theme-toggle" role="group" aria-label="Reading theme">
            <button
              className={settings.theme === 'paper' ? 'active' : ''}
              onClick={() => onReaderSettings?.({ theme: 'paper' })}
            >
              Paper
            </button>
            <button
              className={settings.theme === 'dark' ? 'active' : ''}
              onClick={() => onReaderSettings?.({ theme: 'dark' })}
            >
              Dark
            </button>
          </div>
          <div className="book-size-toggle" role="group" aria-label="Text size">
            <button onClick={() => adjustFontScale(-1)} aria-label="Smaller text" disabled={settings.fontScale <= FONT_SCALE_MIN}>A</button>
            <button onClick={() => adjustFontScale(1)} aria-label="Larger text" disabled={settings.fontScale >= FONT_SCALE_MAX}>A</button>
          </div>
        </div>
      )}

      <div className="book-page" key={`${bookKey}-${safeIndex}`}>
        {safeIndex === 0 && <h1 className="book-title">{title}</h1>}
        <MarkdownBlock markdown={Array.isArray(pages[safeIndex]) ? pages[safeIndex].join('\n\n') : String(pages[safeIndex] || '')} />
        {isLastPage && footer && <p className="book-source-note">{footer}</p>}
      </div>

      <div className="book-controls">
        <button
          className="book-nav-button"
          onClick={() => goToPage(safeIndex - 1)}
          disabled={safeIndex === 0}
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <span className="book-page-indicator">{pageCount > 1 ? `${safeIndex + 1} of ${pageCount}` : ''}</span>
        {!isLastPage ? (
          <button className="book-nav-button primary" onClick={goNext}>
            Continue
            <ChevronRight size={16} />
          </button>
        ) : waitingForNextPage ? (
          <span className="book-typing" role="status" aria-label="Writing the next page">
            <span></span><span></span><span></span>
          </span>
        ) : canGenerate ? (
          <button className="book-nav-button primary" onClick={goNext}>
            Continue reading
            <ChevronRight size={16} />
          </button>
        ) : completed ? (
          <span className="book-nav-button is-done"><Check size={16} /> {completeLabel}</span>
        ) : onComplete ? (
          <button className="book-nav-button primary" onClick={onComplete}>
            <Check size={16} />
            {completeLabel}
          </button>
        ) : (
          <span className="book-nav-button is-ghost" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
