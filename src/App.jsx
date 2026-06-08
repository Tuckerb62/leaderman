import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Brain,
  ChevronRight,
  Download,
  FileUp,
  Layers,
  Library,
  LineChart,
  MessageCircle,
  Play,
  ScrollText,
  Search,
  Send,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { clearAiChat, loadAiChat, saveAiChat } from './data/aiChatStorage.js';
import { clearApiKey, loadAiSettings, saveAiSettings, saveApiKey } from './data/aiSettings.js';
import { createInitialState, domains, philosophySchools } from './data/seedData.js';
import { exportState, loadState, parseImportedState, saveState } from './data/storage.js';
import { AI_MODEL_OPTIONS, DEFAULT_AI_SETTINGS, askOpenAI, requiresClientApiKey } from './logic/aiClient.js';
import { isDue, nextReviewState, todayKey } from './logic/reviewScheduler.js';
import { feedQueue, progressStats, recommendedLessons, sourceById, weakDomains } from './logic/selectors.js';
import { markStudied, sessionMinutes } from './logic/studyProgress.js';

const navItems = [
  { id: 'feed', label: 'Feed', icon: Layers },
  { id: 'learn', label: 'Learn', icon: Brain },
  { id: 'philosophy', label: 'Philosophy', icon: ScrollText },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'progress', label: 'Progress', icon: LineChart },
];

const libraryFolders = [
  {
    id: 'all',
    title: 'Everything',
    description: 'All lessons, summaries, and study cards.',
    domains,
    icon: Layers,
  },
  {
    id: 'leadership',
    title: 'Leadership Skills',
    description: 'Judgment, teams, power, conflict, systems, communication, and technology.',
    domains: ['Self-Command', 'Communication', 'Influence', 'Judgment', 'Teams', 'Ethics', 'Power', 'Conflict', 'Systems', 'Technology/Future'],
    icon: Brain,
  },
  {
    id: 'growth',
    title: 'Personal Growth',
    description: 'Philosophy, Stoicism, self-help, attention, habits, and inner discipline.',
    domains: ['Philosophy', 'Self-Help'],
    icon: ScrollText,
  },
  {
    id: 'books',
    title: 'Books & Novels',
    description: 'Classic literature, Sanderson guides, and novel study summaries.',
    domains: ['Literature', 'Novel Summaries'],
    icon: BookOpen,
  },
  {
    id: 'history',
    title: 'World History',
    description: 'Japanese, Roman, Greek, European, revolution, war, and civilization arcs.',
    domains: ['History', 'World History'],
    icon: Library,
  },
];

function queryParam(name) {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

function initialView(state) {
  const requestedView = queryParam('view');
  const requestedLesson = queryParam('lesson');
  if (requestedLesson) return 'learn';
  if (navItems.some((item) => item.id === requestedView)) return requestedView;
  const resumeView = state.settings?.resume?.view;
  return navItems.some((item) => item.id === resumeView) ? resumeView : 'feed';
}

function initialLessonId(state) {
  const requestedLesson = queryParam('lesson');
  const matchingLesson = state.lessons.find((lesson) => lesson.slug === requestedLesson || lesson.id === requestedLesson);
  const resumeLesson = state.lessons.find((lesson) => lesson.id === state.settings?.resume?.lessonId);
  return matchingLesson?.id || resumeLesson?.id || recommendedLessons(state, 1)[0]?.id;
}

function viewTitle(view) {
  return {
    feed: 'Feed',
    learn: 'Learn',
    philosophy: 'Philosophy',
    library: 'Library',
    progress: 'Progress',
  }[view];
}

function formatDateLine() {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}

function formatInterval(days) {
  if (days <= 0) return 'Back today';
  if (days === 1) return 'Back tomorrow';
  if (days < 14) return `Back in ${days} days`;
  if (days < 60) return `Back in ${Math.round(days / 7)} weeks`;
  return `Back in ${Math.round(days / 30)} months`;
}

function reviewBadge(review) {
  if (!review || review.attempts === 0) return { label: 'new', tone: 'new' };
  if (review.status === 'needs-work') return { label: 'due now', tone: 'urgent' };
  if (review.status === 'strong') return { label: 'strong', tone: 'strong' };
  if (isDue(review)) return { label: 'due', tone: 'due' };
  const today = new Date(`${todayKey()}T12:00:00`);
  const due = new Date(`${review.dueAt}T12:00:00`);
  const days = Math.max(1, Math.round((due - today) / 86400000));
  return { label: `in ${days}d`, tone: 'later' };
}

const domainArtwork = {
  'Self-Command': { mark: 'SC', accent: '#8d9a78', secondary: '#5f6a4d' },
  Communication: { mark: 'CM', accent: '#b59a6a', secondary: '#7a6230' },
  Influence: { mark: 'IF', accent: '#9e8064', secondary: '#604c38' },
  Judgment: { mark: 'JD', accent: '#8f987f', secondary: '#4f5b43' },
  Teams: { mark: 'TM', accent: '#a58d71', secondary: '#6d5840' },
  Ethics: { mark: 'ET', accent: '#9e8f74', secondary: '#6e6046' },
  Power: { mark: 'PW', accent: '#9e5e4f', secondary: '#65352f' },
  Conflict: { mark: 'CF', accent: '#b17d61', secondary: '#714734' },
  Systems: { mark: 'SY', accent: '#81958a', secondary: '#465a4f' },
  'Technology/Future': { mark: 'AI', accent: '#8095a0', secondary: '#425862' },
  Philosophy: { mark: 'PH', accent: '#9b9078', secondary: '#5b5445' },
  'Self-Help': { mark: 'SH', accent: '#9aa476', secondary: '#586240' },
  Literature: { mark: 'LT', accent: '#a78b75', secondary: '#624a3e' },
  History: { mark: 'HS', accent: '#b09a6d', secondary: '#685334' },
  'Novel Summaries': { mark: 'NV', accent: '#a78b75', secondary: '#624a3e' },
  'World History': { mark: 'WH', accent: '#b09a6d', secondary: '#685334' },
};

function sourceInitials(label) {
  return label
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

function feedArtwork(lesson, sources) {
  const source = sources[0];
  const sourceTitle = source?.title || lesson.sourceBasis?.[0] || lesson.domain;
  const sourceAuthor = source?.author || 'Source tradition';
  const domain = domainArtwork[lesson.domain] || {};
  return {
    mark: domain.mark || sourceInitials(sourceTitle || lesson.title) || 'LM',
    sourceTitle,
    sourceAuthor,
    accent: domain.accent || '#8d9a78',
    secondary: domain.secondary || '#5f6a4d',
  };
}

function displayLessonTitle(state, lessonId) {
  if (!lessonId) return 'General';
  return state.lessons.find((lesson) => lesson.id === lessonId)?.title || 'General';
}

function isSummaryLesson(lesson) {
  return lesson?.contentType === 'summary';
}

function withResume(current, patch) {
  const currentResume = current.settings?.resume || {};
  const nextResume = {
    view: currentResume.view || 'feed',
    lessonId: currentResume.lessonId || null,
    feedLessonId: currentResume.feedLessonId || null,
    updatedAt: currentResume.updatedAt || null,
    ...patch,
  };
  const unchanged =
    currentResume.view === nextResume.view &&
    currentResume.lessonId === nextResume.lessonId &&
    currentResume.feedLessonId === nextResume.feedLessonId;

  if (unchanged) return current;

  return {
    ...current,
    settings: {
      ...current.settings,
      resume: {
        ...nextResume,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export default function App() {
  const [state, setState] = useState(() => loadState());
  const [view, setView] = useState(() => initialView(state));
  const [selectedLessonId, setSelectedLessonId] = useState(() => initialLessonId(state));
  const [session, setSession] = useState(null);
  const [sessionSummary, setSessionSummary] = useState('');
  const [contextLessonId, setContextLessonId] = useState(null);

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    setState((current) =>
      withResume(current, {
        view,
        lessonId: selectedLessonId || null,
      }),
    );
  }, [view, selectedLessonId]);

  const stats = useMemo(() => progressStats(state), [state]);
  const selectedLesson = state.lessons.find((lesson) => lesson.id === selectedLessonId) || state.lessons[0];
  const aiContextLesson = state.lessons.find((lesson) => lesson.id === contextLessonId) || selectedLesson;

  function markCurrentStudied(current) {
    return {
      ...current,
      settings: markStudied(current.settings),
    };
  }

  function updateReview(lessonId, rating) {
    const lesson = state.lessons.find((item) => item.id === lessonId);
    setState((current) => {
      const next = markCurrentStudied(current);
      return {
        ...next,
        reviews: {
          ...next.reviews,
          [lessonId]: nextReviewState(next.reviews[lessonId], rating),
        },
        reflections:
          rating === 'work'
            ? [
                {
                  id: `reflection-${crypto.randomUUID()}`,
                  lessonId,
                  text: `Flagged "${lesson?.title}" for more practice.`,
                  createdAt: new Date().toISOString(),
                },
                ...next.reflections,
              ].slice(0, 100)
            : next.reflections,
      };
    });
  }

  function startSession(lessonIds = recommendedLessons(state, 5).map((lesson) => lesson.id)) {
    const nextSession = {
      id: `session-${crypto.randomUUID()}`,
      startedAt: new Date().toISOString(),
      lessonIds,
      currentIndex: 0,
      results: { know: 0, later: 0, work: 0 },
    };
    setSession(nextSession);
    setSelectedLessonId(lessonIds[0]);
    setContextLessonId(lessonIds[0]);
    setView('learn');
  }

  function rateCurrentLesson(rating) {
    if (!selectedLesson) return;
    updateReview(selectedLesson.id, rating);

    if (!session) return;
    const nextResults = {
      ...session.results,
      [rating]: session.results[rating] + 1,
    };
    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.lessonIds.length) {
      const endedAt = new Date().toISOString();
      const finished = {
        id: session.id,
        startedAt: session.startedAt,
        endedAt,
        lessonIds: session.lessonIds,
        results: nextResults,
        minutes: sessionMinutes(session.startedAt, endedAt),
      };
      const projectedSettings = markStudied(state.settings);
      setState((current) => {
        const next = markCurrentStudied(current);
        return {
          ...next,
          sessions: [finished, ...next.sessions].slice(0, 10),
        };
      });
      setSession(null);
      setSessionSummary(
        `Session done. ${nextResults.know} got it · ${nextResults.later} later · ${nextResults.work} again · streak ${projectedSettings.streakDays || 1} days.`,
      );
      window.setTimeout(() => {
        setSessionSummary('');
        setView('progress');
      }, 2400);
      return;
    }
    setSession({ ...session, currentIndex: nextIndex, results: nextResults });
    setSelectedLessonId(session.lessonIds[nextIndex]);
    setContextLessonId(session.lessonIds[nextIndex]);
  }

  function saveReflection(lessonId, text) {
    if (!text.trim()) return;
    setState((current) => {
      const next = markCurrentStudied(current);
      return {
        ...next,
        reflections: [
          {
            id: `reflection-${crypto.randomUUID()}`,
            lessonId,
            text: text.trim(),
            createdAt: new Date().toISOString(),
          },
          ...next.reflections,
        ].slice(0, 100),
      };
    });
  }

  function saveLessonNote(lessonId, note) {
    setState((current) => ({
      ...current,
      notes: {
        ...current.notes,
        [lessonId]: note,
      },
    }));
  }

  function saveReadingProgress(lessonId, chapterIndex, markComplete = false) {
    setState((current) => {
      const existing = current.readingProgress?.[lessonId] || { completedChapters: [] };
      const completedChapters = markComplete
        ? Array.from(new Set([...(existing.completedChapters || []), chapterIndex])).sort((a, b) => a - b)
        : existing.completedChapters || [];
      const next = markCurrentStudied(current);
      return {
        ...next,
        readingProgress: {
          ...(next.readingProgress || {}),
          [lessonId]: {
            lessonId,
            chapterIndex,
            completedChapters,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  async function importBackup(file) {
    if (!file) return;
    const text = await file.text();
    setState(parseImportedState(text));
  }

  function resetLocalData() {
    if (window.confirm('Reset all local Leaderman progress, notes, and reflections on this device?')) {
      setState(createInitialState());
      setSession(null);
      setSessionSummary('');
      setView('feed');
    }
  }

  const rememberFeedLesson = useCallback((lessonId) => {
    setContextLessonId(lessonId);
    setState((current) =>
      withResume(current, {
        view: 'feed',
        feedLessonId: lessonId,
      }),
    );
  }, []);

  const commonProps = {
    state,
    selectedLesson,
    setSelectedLessonId,
    setContextLessonId,
    setView,
    startSession,
    updateReview,
    rateCurrentLesson,
    saveReflection,
    saveLessonNote,
    saveReadingProgress,
    rememberFeedLesson,
    session,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <p>Leaderman</p>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? 'nav-item active' : 'nav-item'}
                onClick={() => setView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="backup-row compact">
          <button className="icon-button" onClick={() => exportState(state)} title="Export backup">
            <Download size={16} />
          </button>
          <label className="icon-button" title="Import backup">
            <FileUp size={16} />
            <input type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
          </label>
          <button className="icon-button" onClick={resetLocalData} title="Reset local data">
            <Trash2 size={16} />
          </button>
        </div>
      </aside>

      <main className={view === 'feed' ? 'main-shell feed-main' : 'main-shell'}>
        {view !== 'feed' && (
          <header className="topbar">
            <div>
              <p className="date-line">{formatDateLine()}</p>
              <h1>{viewTitle(view)}</h1>
            </div>
            <button className="secondary-button" onClick={() => startSession()}>
              <Play size={16} />
              Session
            </button>
          </header>
        )}

        {sessionSummary && <div className="session-summary">{sessionSummary}</div>}
        {view === 'feed' && <FeedView {...commonProps} />}
        {view === 'learn' && <LearnView {...commonProps} />}
        {view === 'philosophy' && <PhilosophyView {...commonProps} />}
        {view === 'library' && <LibraryView {...commonProps} />}
        {view === 'progress' && <ProgressView {...commonProps} stats={stats} />}
      </main>

      <FloatingAiPanel lesson={aiContextLesson} />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FeedView({ state, updateReview, saveReflection, setSelectedLessonId, setContextLessonId, setView, rememberFeedLesson }) {
  const [expandedId, setExpandedId] = useState(null);
  const [ratedCards, setRatedCards] = useState({});
  const [feedIds] = useState(() => feedQueue(state, 100).map((lesson) => lesson.id));
  const feedStackRef = useRef(null);
  const restoredFeedPosition = useRef(false);
  const rememberFrame = useRef(0);
  const lessons = useMemo(() => feedIds.map((lessonId) => state.lessons.find((lesson) => lesson.id === lessonId)).filter(Boolean), [feedIds, state.lessons]);

  useEffect(() => {
    if (restoredFeedPosition.current) return;
    const resumeLessonId = state.settings?.resume?.feedLessonId;
    if (!resumeLessonId || !feedIds.includes(resumeLessonId)) return;

    const target = feedStackRef.current?.querySelector(`[data-lesson-id="${resumeLessonId}"]`);
    if (!target) return;

    restoredFeedPosition.current = true;
    setContextLessonId(resumeLessonId);
    window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }, [feedIds, setContextLessonId, state.settings?.resume?.feedLessonId]);

  useEffect(() => {
    const stack = feedStackRef.current;
    if (!stack) return undefined;

    function rememberVisibleCard() {
      window.cancelAnimationFrame(rememberFrame.current);
      rememberFrame.current = window.requestAnimationFrame(() => {
        const cardHeight = Math.max(stack.clientHeight, 1);
        const index = Math.max(0, Math.min(lessons.length - 1, Math.round(stack.scrollTop / cardHeight)));
        const lessonId = lessons[index]?.id;
        if (lessonId) rememberFeedLesson(lessonId);
      });
    }

    rememberVisibleCard();
    stack.addEventListener('scroll', rememberVisibleCard, { passive: true });
    return () => {
      window.cancelAnimationFrame(rememberFrame.current);
      stack.removeEventListener('scroll', rememberVisibleCard);
    };
  }, [lessons, rememberFeedLesson]);

  function openFullLesson(lessonId) {
    setSelectedLessonId(lessonId);
    setContextLessonId(lessonId);
    setView('learn');
  }

  return (
    <section className="feed-view">
      <div className="feed-stack" ref={feedStackRef}>
        {lessons.map((lesson) => (
          <FeedCard
            key={lesson.id}
            lesson={lesson}
            review={state.reviews[lesson.id]}
            sources={lesson.sourceIds.map((id) => sourceById(state, id)).filter(Boolean)}
            expanded={expandedId === lesson.id}
            rated={ratedCards[lesson.id]}
            onExpand={() => {
              const nextId = expandedId === lesson.id ? null : lesson.id;
              setExpandedId(nextId);
              if (nextId) setContextLessonId(nextId);
            }}
            onRate={(rating) => {
              const nextReview = nextReviewState(state.reviews[lesson.id], rating);
              setRatedCards((current) => ({
                ...current,
                [lesson.id]: {
                  rating,
                  label: rating === 'know' ? formatInterval(nextReview.intervalDays) : 'Back today',
                },
              }));
              updateReview(lesson.id, rating);
              window.setTimeout(() => {
                setRatedCards((current) => ({
                  ...current,
                  [lesson.id]: {
                    ...(current[lesson.id] || {}),
                    compact: true,
                  },
                }));
              }, 1500);
            }}
            onSkip={() =>
              setRatedCards((current) => ({
                ...current,
                [lesson.id]: { rating: 'skip', label: 'Skipped', compact: true },
              }))
            }
            onSaveReflection={(text) => saveReflection(lesson.id, text)}
            onOpenFull={() => openFullLesson(lesson.id)}
          />
        ))}
      </div>
    </section>
  );
}

function FeedCard({ lesson, review, sources, expanded, rated, onExpand, onRate, onSkip, onSaveReflection, onOpenFull }) {
  const badge = reviewBadge(review);
  const artwork = feedArtwork(lesson, sources);
  const summaryLesson = isSummaryLesson(lesson);
  const [decision, setDecision] = useState('');
  const [reflection, setReflection] = useState('');
  const gesture = useRef({ lastTapAt: 0, startX: 0, startY: 0, startedAt: 0 });
  const cardStyle = {
    '--feed-accent': artwork.accent,
    '--feed-accent-2': artwork.secondary,
  };

  function isInteractiveTarget(target) {
    return target.closest('button, textarea, input, select, a, label, summary, details');
  }

  function moveToNextCard(card) {
    const nextCard = card.nextElementSibling;
    if (nextCard) {
      window.setTimeout(() => nextCard.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
    }
  }

  function handleGestureStart(event) {
    if (isInteractiveTarget(event.target)) return;
    gesture.current = {
      ...gesture.current,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: Date.now(),
    };
  }

  function handleGestureEnd(event) {
    if (isInteractiveTarget(event.target)) return;

    const dx = event.clientX - gesture.current.startX;
    const dy = event.clientY - gesture.current.startY;
    const distance = Math.hypot(dx, dy);
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const swipeThreshold = 72;

    if (distance >= swipeThreshold) {
      if (expanded) return;
      gesture.current.lastTapAt = 0;
      if (absX > absY) {
        onRate(dx > 0 ? 'know' : 'work');
        return;
      }
      if (dy < 0) {
        onSkip();
        moveToNextCard(event.currentTarget);
      }
      return;
    }

    const now = Date.now();
    if (now - gesture.current.lastTapAt < 320) {
      gesture.current.lastTapAt = 0;
      onExpand();
      return;
    }
    gesture.current.lastTapAt = now;
  }

  function handleGestureKeyDown(event) {
    if (isInteractiveTarget(event.target)) return;
    if (expanded && event.key !== 'Enter') return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onRate('know');
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onRate('work');
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onSkip();
      moveToNextCard(event.currentTarget);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      onExpand();
    }
  }

  if (rated?.compact) {
    return (
      <article className="feed-card rated-line" style={cardStyle} data-lesson-id={lesson.id}>
        <div className="feed-backdrop" aria-hidden="true">
          <span className="feed-backdrop-mark">{artwork.mark}</span>
          <span className="feed-backdrop-source">
            <span>{artwork.sourceTitle}</span>
            <small>{artwork.sourceAuthor}</small>
          </span>
        </div>
        <div className="rated-line-content">
          <span>{lesson.title}</span>
          <small>{rated.rating === 'know' ? 'got it' : rated.rating === 'work' ? 'again' : 'skipped'}</small>
        </div>
      </article>
    );
  }

  return (
    <article
      className={expanded ? 'feed-card expanded' : 'feed-card'}
      style={cardStyle}
      data-lesson-id={lesson.id}
      tabIndex={0}
      onPointerDown={handleGestureStart}
      onPointerUp={handleGestureEnd}
      onKeyDown={handleGestureKeyDown}
      aria-label={`${lesson.title}. Swipe right for got it, left for again, up to skip, or double tap to go deeper.`}
    >
      <div className="feed-backdrop" aria-hidden="true">
        <span className="feed-backdrop-mark">{artwork.mark}</span>
        <span className="feed-backdrop-source">
          <span>{artwork.sourceTitle}</span>
          <small>{artwork.sourceAuthor}</small>
        </span>
      </div>
      <div className="feed-card-content">
        <div className="feed-card-head">
          <span className="domain-tag">{lesson.domain}</span>
          <span className={`status-badge ${badge.tone}`}>{badge.label}</span>
        </div>
        <h2>{lesson.title}</h2>
        <p className="core-idea">{lesson.coreIdea}</p>
        <p className="source-line">{artwork.sourceTitle}</p>
        {rated && <p className="rating-feedback">{rated.label}</p>}

        {expanded && summaryLesson && (
          <SummaryLessonBody lesson={lesson} sources={sources} onOpenFull={onOpenFull} />
        )}

        {expanded && !summaryLesson && (
          <div className="feed-expanded">
            <div className="article-body">
              {lesson.articleParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="two-column">
              <InfoBlock title="What it gets right" text={lesson.whatItGetsRight} />
              <InfoBlock title="Fidelity note" text={lesson.fidelityNote} />
            </div>
            <div className="lesson-section">
              <h3>Scenario</h3>
              <p>{lesson.scenario}</p>
              <InfoBlock title="Practice rep" text={lesson.practiceRep} />
            </div>
            <DecisionOptions lesson={lesson} selected={decision} onSelect={setDecision} />
            <div className="lesson-section">
              <h3>Reflection</h3>
              <p>{lesson.reflectionPrompt}</p>
              <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="Write the private answer you want to remember..." />
              <button
                className="secondary-button"
                onClick={() => {
                  onSaveReflection(reflection);
                  setReflection('');
                }}
              >
                Save reflection
              </button>
            </div>
            <div className="source-grid">
              {sources.map((source) => (
                <SourceMini key={source.id} source={source} />
              ))}
            </div>
            <button className="text-link" onClick={onOpenFull}>Open full lesson →</button>
          </div>
        )}

        {!expanded && <span className="swipe-hint">Right got it · left again · up skip · double tap deeper</span>}
      </div>
    </article>
  );
}

function DecisionOptions({ lesson, selected, onSelect }) {
  const answered = Boolean(selected);
  return (
    <div className="lesson-section">
      <h3>Decision options</h3>
      <div className="option-list">
        {lesson.decisionOptions.map((option) => {
          const isSelected = selected === option;
          const isPreferred = answered && option === lesson.preferredOption;
          return (
            <button
              key={option}
              className={isPreferred ? 'option-card preferred' : isSelected ? 'option-card selected' : 'option-card'}
              onClick={() => onSelect(option)}
            >
              {option}
              {isPreferred && <span>best first move</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <InfoBlock
          title={selected === lesson.preferredOption ? 'Why it works' : `Preferred move: ${lesson.preferredOption}`}
          text={lesson.reviewPrompt}
        />
      )}
    </div>
  );
}

function SummaryLessonBody({ lesson, sources, onOpenFull }) {
  return (
    <div className="feed-expanded summary-expanded">
      <div className="article-body">
        {lesson.articleParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="two-column">
        <InfoList title="Key points" items={lesson.summaryBullets || []} />
        <InfoList title={lesson.summaryKind === 'History' ? 'Timeline' : 'Characters / structure'} items={lesson.timeline || []} />
      </div>
      <InfoList title="Themes to remember" items={lesson.themeNotes || []} />
      <div className="source-grid">
        {sources.map((source) => (
          <SourceMini key={source.id} source={source} />
        ))}
      </div>
      {onOpenFull && <button className="text-link" onClick={onOpenFull}>Open full summary →</button>}
    </div>
  );
}

function InfoList({ title, items }) {
  return (
    <div className="lesson-section">
      <h3>{title}</h3>
      <ul className="summary-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ChapterReader({ lesson, chapters, currentIndex, progress, onSelectChapter, onCompleteChapter }) {
  const currentChapter = chapters[currentIndex] || chapters[0];
  const completed = new Set(progress?.completedChapters || []);
  const completedCount = completed.size;
  const percent = Math.round((completedCount / chapters.length) * 100);

  return (
    <div className="chapter-reader">
      <div className="chapter-reader-head">
        <div>
          <p className="reading-meta">
            Source basis: {lesson.sourceBasis.join(', ')} · {chapters.length} chapter summaries
          </p>
          <h3>{currentChapter.title}</h3>
        </div>
        <span>{completedCount}/{chapters.length} read</span>
      </div>

      <div className="chapter-progress" aria-label={`${percent}% read`}>
        <span style={{ width: `${percent}%` }} />
      </div>

      <div className="chapter-reader-layout">
        <div className="chapter-list" aria-label={`${lesson.title} chapter summaries`}>
          {chapters.map((chapter, index) => (
            <button key={chapter.id} className={index === currentIndex ? 'chapter-row active' : 'chapter-row'} onClick={() => onSelectChapter(index)}>
              <span>{completed.has(index) ? 'Read' : `Ch ${chapter.number}`}</span>
              <strong>{chapter.title.replace(/^Chapter \d+:\s*/, '')}</strong>
            </button>
          ))}
        </div>

        <article className="chapter-card">
          <p>{currentChapter.summary}</p>
          {currentChapter.keyPoints?.length > 0 && (
            <div className="chapter-keypoints">
              <span>Remember</span>
              <ul>
                {currentChapter.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="chapter-actions">
            <button className="secondary-button" onClick={() => onSelectChapter(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
              Previous
            </button>
            <button className="success-button" onClick={onCompleteChapter}>
              {currentIndex >= chapters.length - 1 ? 'Mark read' : 'Mark read & continue'}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

function PhilosophyView({ state, setSelectedLessonId, startSession, setView }) {
  const lessonBySlug = new Map(state.lessons.map((lesson) => [lesson.slug, lesson]));
  const stoicSchool = philosophySchools.find((school) => school.id === 'stoicism');
  const stoicLessons = stoicSchool.lessonSlugs.map((slug) => lessonBySlug.get(slug)).filter(Boolean);

  function openLesson(lessonId) {
    setSelectedLessonId(lessonId);
    setView('learn');
  }

  return (
    <section className="philosophy-grid">
      <div className="philosophy-hero">
        <div>
          <p className="section-label">Philosophy as leadership practice</p>
          <h2>Schools of thought for judgment, restraint, courage, and meaning.</h2>
          <p>
            Philosophy here is not trivia or quote collecting. Each school is treated as a training lens:
            a way to read pressure, desire, status, duty, suffering, truth, and action before power magnifies them.
          </p>
        </div>
        <button className="primary-button" onClick={() => startSession(stoicLessons.map((lesson) => lesson.id))}>
          <Play size={16} />
          Start Stoicism track
        </button>
      </div>

      <div className="stoic-track">
        <p className="section-label">Featured track</p>
        <h2>Stoicism</h2>
        <p>
          Start here if you want a practical operating system for self-command: control what is yours,
          remember mortality, and widen the frame before ego takes the wheel.
        </p>
        <div className="stoic-track-list">
          {stoicLessons.map((lesson, index) => (
            <button key={lesson.id} className="stoic-track-row" onClick={() => openLesson(lesson.id)}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{lesson.title}</strong>
                <p>{lesson.coreIdea}</p>
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="school-grid">
        {philosophySchools.map((school) => {
          const lessons = school.lessonSlugs.map((slug) => lessonBySlug.get(slug)).filter(Boolean);
          return (
            <article key={school.id} className={school.id === 'stoicism' ? 'school-card featured' : 'school-card'}>
              <div>
                <span>{school.era}</span>
                <h3>{school.name}</h3>
                <p>{school.summary}</p>
              </div>
              <div className="school-lessons">
                {lessons.map((lesson) => (
                  <button key={lesson.id} className="school-lesson-button" onClick={() => openLesson(lesson.id)}>
                    {lesson.title}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LearnView({ state, selectedLesson, session, setSelectedLessonId, setContextLessonId, rateCurrentLesson, updateReview, saveReflection, saveLessonNote, saveReadingProgress }) {
  const summaryLesson = isSummaryLesson(selectedLesson);
  const savedReadingProgress = state.readingProgress?.[selectedLesson.id];
  const chapterSummaries = selectedLesson.chapterSummaries || [];
  const savedChapterIndex = Math.max(0, Math.min(chapterSummaries.length - 1, savedReadingProgress?.chapterIndex || 0));
  const [step, setStep] = useState(() => (summaryLesson ? 'summary' : 'article'));
  const [currentChapterIndex, setCurrentChapterIndex] = useState(savedChapterIndex);
  const [reflection, setReflection] = useState('');
  const [decision, setDecision] = useState('');
  const [showFidelity, setShowFidelity] = useState(false);
  const sources = selectedLesson.sourceIds.map((id) => sourceById(state, id)).filter(Boolean);
  const sessionProgress = session ? `${session.currentIndex + 1} / ${session.lessonIds.length}` : 'Solo lesson';
  const stepItems = summaryLesson ? ['summary', 'details', 'themes', 'notes'] : ['article', 'scenario', 'decision', 'reflection'];

  useEffect(() => {
    setStep(isSummaryLesson(selectedLesson) ? 'summary' : 'article');
    setCurrentChapterIndex(Math.max(0, Math.min((selectedLesson.chapterSummaries || []).length - 1, state.readingProgress?.[selectedLesson.id]?.chapterIndex || 0)));
    setDecision('');
    setContextLessonId(selectedLesson.id);
  }, [selectedLesson.id, setContextLessonId, state.readingProgress]);

  function selectChapter(index, markComplete = false) {
    setCurrentChapterIndex(index);
    saveReadingProgress(selectedLesson.id, index, markComplete);
  }

  function completeCurrentChapter() {
    const nextIndex = Math.min(chapterSummaries.length - 1, currentChapterIndex + 1);
    selectChapter(nextIndex, true);
  }

  return (
    <section className="learn-grid">
      <div className="lesson-panel">
        <div className="lesson-header">
          <div>
            <p className="section-label">{selectedLesson.domain}</p>
            <h2>{selectedLesson.title}</h2>
          </div>
          <span className="session-chip">{sessionProgress}</span>
        </div>

        <div className="step-tabs">
          {stepItems.map((item) => (
            <button key={item} className={step === item ? 'active' : ''} onClick={() => setStep(item)}>
              {item}
            </button>
          ))}
        </div>

        {summaryLesson && step === 'summary' && chapterSummaries.length > 0 && (
          <ChapterReader
            lesson={selectedLesson}
            chapters={chapterSummaries}
            currentIndex={currentChapterIndex}
            progress={savedReadingProgress}
            onSelectChapter={selectChapter}
            onCompleteChapter={completeCurrentChapter}
          />
        )}

        {summaryLesson && step === 'summary' && chapterSummaries.length === 0 && (
          <div className="article-section">
            <p className="reading-meta">
              Source basis: {selectedLesson.sourceBasis.join(', ')} · Type: {selectedLesson.summaryKind}
            </p>
            <div className="article-body">
              {selectedLesson.articleParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {summaryLesson && step === 'details' && (
          <div className="two-column">
            <InfoList title="Key points" items={selectedLesson.summaryBullets || []} />
            <InfoList title={selectedLesson.summaryKind === 'History' ? 'Timeline' : 'Characters / structure'} items={selectedLesson.timeline || []} />
          </div>
        )}

        {summaryLesson && step === 'themes' && <InfoList title="Themes to remember" items={selectedLesson.themeNotes || []} />}

        {summaryLesson && step === 'notes' && (
          <div className="lesson-section">
            <h3>Private notes</h3>
            <p>Capture what you want to remember from this summary.</p>
            <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="Write the private note you want to remember..." />
            <button
              className="secondary-button"
              onClick={() => {
                saveReflection(selectedLesson.id, reflection);
                setReflection('');
              }}
            >
              Save note
            </button>
          </div>
        )}

        {!summaryLesson && step === 'article' && (
          <div className="article-section">
            <p className="reading-meta">
              Source basis: {selectedLesson.sourceBasis.join(', ')} · Historical lens: {selectedLesson.historicalExample?.title || 'Leadership history'}
            </p>
            <div className="article-body">
              {selectedLesson.articleParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="two-column">
              <InfoBlock title="What it gets right" text={selectedLesson.whatItGetsRight} />
              <InfoBlock title="Fidelity note" text={selectedLesson.fidelityNote} />
            </div>
          </div>
        )}

        {!summaryLesson && step === 'scenario' && (
          <div className="lesson-section">
            <h3>Scenario</h3>
            <p>{selectedLesson.scenario}</p>
            <InfoBlock title="Practice rep" text={selectedLesson.practiceRep} />
          </div>
        )}

        {!summaryLesson && step === 'decision' && <DecisionOptions lesson={selectedLesson} selected={decision} onSelect={setDecision} />}

        {!summaryLesson && step === 'reflection' && (
          <div className="lesson-section">
            <h3>Reflection</h3>
            <p>{selectedLesson.reflectionPrompt}</p>
            <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="Write the private answer you want to remember..." />
            <button
              className="secondary-button"
              onClick={() => {
                saveReflection(selectedLesson.id, reflection);
                setReflection('');
              }}
            >
              Save reflection
            </button>
          </div>
        )}

        <div className="rating-bar">
          <button className="success-button" onClick={() => (session ? rateCurrentLesson('know') : updateReview(selectedLesson.id, 'know'))}>
            Know it
          </button>
          <button className="secondary-button" onClick={() => (session ? rateCurrentLesson('later') : updateReview(selectedLesson.id, 'later'))}>
            Review later
          </button>
          <button className="warning-button" onClick={() => (session ? rateCurrentLesson('work') : updateReview(selectedLesson.id, 'work'))}>
            Needs work
          </button>
        </div>
      </div>

      <aside className="right-rail">
        <button className="secondary-button wide" onClick={() => setShowFidelity((current) => !current)}>
          {showFidelity ? 'Hide sources & fidelity' : 'Show sources & fidelity'}
        </button>
        {showFidelity && (
          <>
            <FidelityPanel lesson={selectedLesson} />
            <div className="source-panel">
              <p className="section-label">Source basis</p>
              {sources.map((source) => (
                <SourceMini key={source.id} source={source} />
              ))}
            </div>
          </>
        )}
        <NoteBox note={state.notes[selectedLesson.id] || ''} onSave={(note) => saveLessonNote(selectedLesson.id, note)} />
      </aside>

      <div className="queue-panel">
        <p className="section-label">Next lessons</p>
        {recommendedLessons(state, 8).map((lesson) => (
          <button
            key={lesson.id}
            className={lesson.id === selectedLesson.id ? 'queue-row active' : 'queue-row'}
            onClick={() => {
              setSelectedLessonId(lesson.id);
              setContextLessonId(lesson.id);
            }}
          >
            <span>{lesson.title}</span>
            <small>{lesson.domain}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function LibraryView({ state, selectedLesson, setSelectedLessonId, setContextLessonId, setView }) {
  const [query, setQuery] = useState('');
  const [folderId, setFolderId] = useState('all');
  const [domain, setDomain] = useState('All');
  const selectedFolder = libraryFolders.find((folder) => folder.id === folderId) || libraryFolders[0];
  const domainOptions = selectedFolder.id === 'all' ? [] : selectedFolder.domains.filter((item) => state.lessons.some((lesson) => lesson.domain === item));
  const filteredLessons = state.lessons.filter((lesson) => {
    const text = `${lesson.title} ${lesson.domain} ${lesson.coreIdea} ${(lesson.tags || []).join(' ')}`.toLowerCase();
    const inFolder = selectedFolder.id === 'all' || selectedFolder.domains.includes(lesson.domain);
    return inFolder && (domain === 'All' || lesson.domain === domain) && text.includes(query.toLowerCase());
  });
  const filteredSources = state.sources.filter((source) => {
    const text = `${source.title} ${source.author} ${source.domain} ${source.usefulIdea} ${(source.tags || []).join(' ')}`.toLowerCase();
    const inFolder = selectedFolder.id === 'all' || selectedFolder.domains.includes(source.domain);
    return inFolder && (domain === 'All' || source.domain === domain) && text.includes(query.toLowerCase());
  });

  function openLesson(lessonId) {
    setSelectedLessonId(lessonId);
    setContextLessonId(lessonId);
    setView('learn');
  }

  function chooseFolder(nextFolderId) {
    setFolderId(nextFolderId);
    setDomain('All');
  }

  return (
    <section className="library-grid">
      <div className="library-main">
        <div className="search-row">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons, concepts, or tags" />
        </div>

        <div className="folder-grid" aria-label="Library folders">
          {libraryFolders.map((folder) => {
            const Icon = folder.icon;
            const count = folder.id === 'all' ? state.lessons.length : state.lessons.filter((lesson) => folder.domains.includes(lesson.domain)).length;
            return (
              <button key={folder.id} className={folderId === folder.id ? 'folder-card active' : 'folder-card'} onClick={() => chooseFolder(folder.id)}>
                <span className="folder-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{folder.title}</strong>
                  <small>{count} cards</small>
                </span>
                <p>{folder.description}</p>
              </button>
            );
          })}
        </div>

        {domainOptions.length > 0 && (
          <div className="domain-filter compact">
            {['All', ...domainOptions].map((item) => (
              <button key={item} className={domain === item ? 'active' : ''} onClick={() => setDomain(item)}>
                {item === 'All' ? `All ${selectedFolder.title}` : item}
              </button>
            ))}
          </div>
        )}

        <div className="library-section-head">
          <div>
            <p className="section-label">{selectedFolder.title}</p>
            <h3>{domain === 'All' ? 'Choose what to read' : domain}</h3>
          </div>
          <span>{filteredLessons.length} cards</span>
        </div>

        <div className="library-list">
          {filteredLessons.map((lesson) => {
            const progress = state.readingProgress?.[lesson.id];
            const chapterCount = lesson.chapterSummaries?.length || 0;
            return (
              <button key={lesson.id} className={selectedLesson.id === lesson.id ? 'library-row active' : 'library-row'} onClick={() => openLesson(lesson.id)}>
                <div>
                  <strong>{lesson.title}</strong>
                  <p>{lesson.coreIdea}</p>
                </div>
                <span className="library-row-meta">
                  {lesson.domain}
                  {chapterCount > 0 && <small>{progress ? `Chapter ${progress.chapterIndex + 1}/${chapterCount}` : `${chapterCount} chapters`}</small>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="source-list-panel">
        <p className="section-label">Source cards</p>
        {filteredSources.map((source) => (
          <article key={source.id} className="source-card">
            <span>{source.domain}</span>
            <h3>{source.title}</h3>
            <p>{source.usefulIdea}</p>
            <small>{source.author}</small>
          </article>
        ))}
        {filteredSources.length === 0 && <p className="empty-copy">No source cards match this folder.</p>}
      </aside>
    </section>
  );
}

function ProgressView({ state, stats, startSession }) {
  const weak = weakDomains(state).filter((item) => item.needsWork > 0).slice(0, 5);
  return (
    <section className="progress-grid">
      <div className="progress-hero">
        <p className="section-label">Local progress</p>
        <div className="progress-metrics">
          <Metric label="Streak" value={stats.streakDays} />
          <Metric label="Lessons touched" value={stats.completed} />
          <Metric label="Mastery" value={`${stats.mastery}%`} />
        </div>
        <button className="primary-button" onClick={() => startSession()}>
          <Play size={16} />
          Continue
        </button>
      </div>

      <div className="signal-panel">
        <p className="section-label">Weak areas</p>
        {weak.length === 0 && <p className="empty-copy">No weak areas yet.</p>}
        {weak.map((item) => (
          <div key={item.domain} className="weak-row">
            <span>{item.domain}</span>
            <small>{item.needsWorkRate}% needs work</small>
          </div>
        ))}
      </div>

      <div className="reflection-panel">
        <p className="section-label">Recent reflections</p>
        {state.reflections.length === 0 && <p className="empty-copy">Your saved reflections will appear here.</p>}
        {state.reflections.slice(0, 8).map((reflection) => (
          <article key={reflection.id} className="reflection-row">
            <strong>{displayLessonTitle(state, reflection.lessonId)}</strong>
            <p>{reflection.text}</p>
            <small>{new Date(reflection.createdAt).toLocaleString()}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function FloatingAiPanel({ lesson }) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadAiSettings());
  const [draftKey, setDraftKey] = useState(() => loadAiSettings().apiKey);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState(() => loadAiChat());
  const [isAsking, setIsAsking] = useState(false);
  const [notice, setNotice] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');
  const [keychainKey, setKeychainKey] = useState('');
  const [isSavingKeychain, setIsSavingKeychain] = useState(false);
  const [useCustomModel, setUseCustomModel] = useState(() => !AI_MODEL_OPTIONS.some((option) => option.id === settings.model));
  const selectedModelOption = AI_MODEL_OPTIONS.find((option) => option.id === settings.model);
  const modelSelectValue = !useCustomModel && selectedModelOption ? selectedModelOption.id : 'custom';
  const effectiveEndpoint = serverStatus === 'ready' || serverStatus === 'missing-key'
    ? DEFAULT_AI_SETTINGS.endpoint
    : settings.endpoint === DEFAULT_AI_SETTINGS.endpoint
      ? 'https://api.openai.com/v1/responses'
      : settings.endpoint;
  const endpointNeedsKey = requiresClientApiKey(effectiveEndpoint);

  useEffect(() => saveAiChat(messages), [messages]);

  function refreshServerStatus() {
    setServerStatus('checking');
    fetch('/api/ai-health')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('No local server'))))
      .then((payload) => setServerStatus(payload.keyConfigured ? 'ready' : 'missing-key'))
      .catch(() => setServerStatus('offline'));
  }

  useEffect(() => refreshServerStatus(), []);

  function updateSettings(nextSettings) {
    setSettings(nextSettings);
    saveAiSettings(nextSettings);
  }

  function updateModelSelection(modelId) {
    if (modelId === 'custom') {
      setUseCustomModel(true);
      return;
    }
    setUseCustomModel(false);
    updateSettings({ ...settings, model: modelId });
  }

  function saveBrowserKey() {
    if (!draftKey.trim()) return;
    saveApiKey(draftKey.trim(), settings.persistKey);
    setSettings({ ...settings, apiKey: draftKey.trim(), hasStoredKey: true });
    setNotice(settings.persistKey ? 'API key saved in this browser.' : 'API key saved for this browser session.');
  }

  function removeBrowserKey() {
    clearApiKey();
    setDraftKey('');
    setSettings({ ...settings, apiKey: '', hasStoredKey: false });
    setNotice('API key cleared.');
  }

  async function saveKeychainKey() {
    const cleanKey = keychainKey.trim();
    if (!cleanKey || isSavingKeychain) return;
    setIsSavingKeychain(true);
    setNotice('');
    try {
      const response = await fetch('/api/save-openai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Could not save the key.');
      setKeychainKey('');
      setNotice('API key saved to macOS Keychain.');
      refreshServerStatus();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setIsSavingKeychain(false);
    }
  }

  async function askQuestion() {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isAsking) return;
    if (serverStatus === 'missing-key') {
      setNotice('Private server is running, but no key is saved yet.');
      setSettingsOpen(true);
      return;
    }
    if (endpointNeedsKey && !settings.apiKey && !draftKey.trim()) {
      setNotice('Add your API key first.');
      setSettingsOpen(true);
      return;
    }

    const userMessage = {
      id: `ai-user-${crypto.randomUUID()}`,
      role: 'user',
      content: cleanQuestion,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion('');
    setIsAsking(true);
    setNotice('');

    try {
      const answer = await askOpenAI({
        apiKey: endpointNeedsKey ? settings.apiKey || draftKey.trim() : '',
        endpoint: effectiveEndpoint,
        model: settings.model,
        messages,
        question: cleanQuestion,
        lesson,
        includeLessonContext: true,
      });
      setMessages([
        ...nextMessages,
        {
          id: `ai-assistant-${crypto.randomUUID()}`,
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          id: `ai-error-${crypto.randomUUID()}`,
          role: 'assistant',
          content: `I could not get an answer: ${error.message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <>
      <button className="ai-float-button" onClick={() => setOpen(true)} aria-label="Open AI Coach">
        <MessageCircle size={21} />
      </button>
      {open && <button className="ai-scrim" onClick={() => setOpen(false)} aria-label="Close AI Coach" />}
      <aside className={open ? 'floating-ai open' : 'floating-ai'} aria-hidden={!open}>
        <div className="floating-ai-head">
          <div>
            <span>AI Coach</span>
            <strong>{lesson?.title || 'Current lesson'}</strong>
          </div>
          <div className="ai-head-actions">
            <button className="icon-button light" onClick={() => setSettingsOpen((current) => !current)} title="AI settings">
              <Settings size={16} />
            </button>
            <button
              className="icon-button light"
              onClick={() => {
                clearAiChat();
                setMessages([]);
              }}
              title="Clear chat"
            >
              <Trash2 size={16} />
            </button>
            <button className="icon-button light" onClick={() => setOpen(false)} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {settingsOpen && (
          <div className="ai-settings-drawer">
            <div className={`server-status ${serverStatus}`}>
              <span>{serverStatus === 'ready' ? 'Private server ready' : serverStatus === 'missing-key' ? 'Key needed' : 'Browser key mode'}</span>
              <p>{serverStatus === 'ready' ? 'Your Mac server will make the API call.' : serverStatus === 'missing-key' ? 'Save a key to Keychain on this Mac.' : 'The local server was not found, so the browser will call OpenAI directly.'}</p>
            </div>
            {serverStatus !== 'offline' && (
              <div className="ai-field">
                <label htmlFor="keychain-key">Save key to Mac Keychain</label>
                <input
                  id="keychain-key"
                  type="password"
                  value={keychainKey}
                  onChange={(event) => setKeychainKey(event.target.value)}
                  placeholder="Paste once, save to Keychain"
                  autoComplete="off"
                />
                <button className="secondary-button" onClick={saveKeychainKey} disabled={!keychainKey.trim() || isSavingKeychain}>
                  {isSavingKeychain ? 'Saving...' : 'Remember on this Mac'}
                </button>
              </div>
            )}
            {endpointNeedsKey && (
              <>
                <div className="ai-field">
                  <label htmlFor="ai-key">OpenAI API key</label>
                  <input
                    id="ai-key"
                    type="password"
                    value={draftKey}
                    onChange={(event) => setDraftKey(event.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                  />
                </div>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={settings.persistKey}
                    onChange={(event) => updateSettings({ ...settings, persistKey: event.target.checked })}
                  />
                  Remember key in this browser
                </label>
                <div className="ai-settings-actions">
                  <button className="secondary-button" onClick={saveBrowserKey}>Save key</button>
                  <button className="secondary-button" onClick={removeBrowserKey}>Clear key</button>
                </div>
              </>
            )}
            <div className="ai-field">
              <label htmlFor="ai-model">Model</label>
              <select id="ai-model" value={modelSelectValue} onChange={(event) => updateModelSelection(event.target.value)}>
                {AI_MODEL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
                <option value="custom">Custom model</option>
              </select>
              <p className="field-help">{selectedModelOption?.description || 'Use this for a newer or account-specific model ID.'}</p>
            </div>
            {modelSelectValue === 'custom' && (
              <div className="ai-field">
                <label htmlFor="ai-custom-model">Custom model ID</label>
                <input id="ai-custom-model" value={settings.model} onChange={(event) => updateSettings({ ...settings, model: event.target.value.trim() })} placeholder="gpt-..." />
              </div>
            )}
            <details>
              <summary>Advanced endpoint</summary>
              <div className="ai-field">
                <label htmlFor="ai-endpoint">Endpoint</label>
                <input id="ai-endpoint" value={settings.endpoint} onChange={(event) => updateSettings({ ...settings, endpoint: event.target.value })} />
              </div>
            </details>
            {notice && <p className="settings-notice">{notice}</p>}
          </div>
        )}

        <div className="ai-message-list" aria-live="polite">
          {messages.length === 0 && (
            <div className="ai-empty">
              <strong>No conversation yet.</strong>
              <p>Ask about the current card, a historical parallel, or a decision you are facing.</p>
            </div>
          )}
          {messages.map((message) => (
            <article key={message.id} className={message.role === 'user' ? 'ai-message user' : 'ai-message assistant'}>
              <span>{message.role === 'user' ? 'You' : 'AI Coach'}</span>
              <p>{message.content}</p>
            </article>
          ))}
          {isAsking && <p className="ai-thinking">Thinking...</p>}
        </div>

        <div className="ai-composer">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about this lesson..."
          />
          <button className="primary-button" onClick={askQuestion} disabled={isAsking || !question.trim()}>
            <Send size={16} />
            Ask
          </button>
        </div>
      </aside>
    </>
  );
}

function FidelityPanel({ lesson }) {
  const summaryLesson = isSummaryLesson(lesson);
  const rows = summaryLesson
    ? [
        ['Source basis', lesson.sourceBasis.join(', ')],
        ['Summary type', lesson.summaryKind === 'History' ? 'World history study guide' : 'Novel study guide'],
        ['Study note', lesson.fidelityNote],
      ]
    : [
        ['Source basis', lesson.sourceBasis.join(', ')],
        ['History lens', lesson.historicalExample?.title || 'General leadership history'],
        ['Analogy', lesson.historicalExample?.analogy || 'Pattern matched to context.'],
        ['Caution', lesson.ethicsCheck],
        ['Fidelity', lesson.fidelityNote],
      ];
  return (
    <div className="fidelity-panel">
      <p className="section-label">Fidelity notes</p>
      {rows.map(([label, text]) => (
        <div key={label} className="fidelity-row">
          <span>{label}</span>
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
}

function InfoBlock({ title, text }) {
  return (
    <div className="info-block">
      <span>{title}</span>
      <p>{text}</p>
    </div>
  );
}

function SourceMini({ source }) {
  return (
    <article className="source-mini">
      <BookOpen size={16} />
      <div>
        <strong>{source.title}</strong>
        <p>{source.usefulIdea}</p>
      </div>
    </article>
  );
}

function NoteBox({ note, onSave }) {
  const [draft, setDraft] = useState(note);

  useEffect(() => setDraft(note), [note]);

  return (
    <div className="note-box">
      <p className="section-label">Private note</p>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add your own working note for this lesson..." />
      <button className="secondary-button" onClick={() => onSave(draft)}>Save note</button>
    </div>
  );
}
