import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Brain,
  ChevronRight,
  Download,
  FileUp,
  Layers,
  Library,
  LineChart,
  MessageCircle,
  Newspaper,
  Play,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  Settings,
  Smartphone,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { clearAiChat, loadAiChat, saveAiChat } from './data/aiChatStorage.js';
import { clearApiKey, loadAiSettings, saveAiSettings, saveApiKey } from './data/aiSettings.js';
import { createInitialState, domains, philosophySchools } from './data/seedData.js';
import { createInitialNewsState, describeNewsFreshness, expireNewsItems, isNewsRefreshDue, mergeNewsRefresh, saveNewsExpansion as saveNewsExpansionState, saveNewsItem as saveNewsItemState } from './data/newsStorage.js';
import { exportState, loadState, parseImportedState, saveState } from './data/storage.js';
import { buildLibraryLessonIndex, buildTopicBank } from './data/topicBank.js';
import { buildSyncSnapshot, mergeSyncSnapshot } from './data/syncState.js';
import { AI_MODEL_OPTIONS, DEFAULT_AI_SETTINGS, askOpenAI, expandLearningContent, requiresClientApiKey } from './logic/aiClient.js';
import { parseExpansionMarkdown } from './logic/expansionMapper.js';
import { buildFeedItems } from './logic/feedAggregation.js';
import { canonicalItemKey } from './logic/itemIdentity.js';
import { resolveCanonicalItemRoute } from './logic/itemRouting.js';
import { isLessonComplete, markLessonComplete, recordQuestionAnswer } from './logic/reviewScheduler.js';
import { fetchSyncHealth, fetchSyncSnapshot, pushSyncSnapshot } from './logic/syncClient.js';
import { feedQueue, progressStats, recommendedLessons, sourceById } from './logic/selectors.js';
import { markStudied, sessionMinutes } from './logic/studyProgress.js';

const navItems = [
  { id: 'feed', label: 'Feed', icon: Layers },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'novels', label: 'Novels', icon: BookOpen },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'progress', label: 'Progress', icon: LineChart },
];

const visibleViews = new Set(navItems.map((item) => item.id));
const addressableViews = new Set([...visibleViews, 'learn']);

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
  if (addressableViews.has(requestedView)) return requestedView;
  const resumeView = state.settings?.resume?.view;
  return addressableViews.has(resumeView) ? resumeView : 'feed';
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
    learn: 'Detail',
    library: 'Library',
    novels: 'Novels',
    news: 'News',
    progress: 'Progress',
  }[view];
}

function formatDateLine() {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}

function progressBadge(review) {
  return isLessonComplete(review)
    ? { label: 'complete', tone: 'complete' }
    : { label: 'unread', tone: 'new' };
}

function expansionKeyFor(lesson, chapter = null) {
  if (!chapter) return `lesson:${lesson.id}`;
  return `chapter:${lesson.id}:${chapter.chapterId || chapter.id || chapter.number || chapter.title}`;
}

function isNovelReadingLesson(lesson) {
  return lesson?.summaryKind === 'Novel';
}

function stripMarkdownSections(markdown = '', headingNames = []) {
  return headingNames.reduce((nextMarkdown, headingName) => {
    const escapedHeading = headingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionPattern = new RegExp(
      `(^|\\n)#{1,3}\\s+${escapedHeading}s?\\s*\\n[\\s\\S]*?(?=\\n#{1,3}\\s+|$)`,
      'gi',
    );
    return nextMarkdown.replace(sectionPattern, '\n').trim();
  }, markdown || '');
}

function readingModeExpansionMarkdown(markdown, lesson) {
  if (!isNovelReadingLesson(lesson)) return markdown;
  return stripMarkdownSections(markdown, ['Question'])
    .replace(/(^|\n)(#{1,3}\s+)Break Down\s*$/gim, '$1$2Reader Guide')
    .replace(/(^|\n)(#{1,3}\s+)Remember\s*$/gim, '$1$2Keep In Mind');
}

function guideTitleFor(lesson) {
  return isNovelReadingLesson(lesson) ? 'Reader Guide' : 'Break Down';
}

function memoryTitleFor(lesson) {
  return isNovelReadingLesson(lesson) ? 'Keep In Mind' : 'Remember';
}

function stepLabelFor(step, lesson) {
  if (isNovelReadingLesson(lesson) && step === 'breakdown') return 'guide';
  return step;
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

function followLabel(topicId = '') {
  return topicId.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const [selectedNewsId, setSelectedNewsId] = useState(() => state.news?.items?.[0]?.id || null);
  const [session, setSession] = useState(null);
  const [sessionSummary, setSessionSummary] = useState('');
  const [contextLessonId, setContextLessonId] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    available: false,
    updatedAt: null,
    path: '',
    error: '',
    mode: 'local',
    localUrl: '',
    phoneUrls: [],
    hostMode: 'local',
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [newsStatus, setNewsStatus] = useState({ refreshing: false, error: '' });
  const syncReadyRef = useRef(false);
  const newsAutoRefreshRef = useRef('');

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    setState((current) =>
      withResume(current, {
        view,
        lessonId: selectedLessonId || null,
      }),
    );
  }, [view, selectedLessonId]);

  useEffect(() => {
    setState((current) => ({
      ...current,
      news: expireNewsItems(current.news || createInitialNewsState()),
    }));
  }, []);

  const libraryLessons = useMemo(() => buildLibraryLessonIndex(state.lessons), [state.lessons]);
  const topicBank = useMemo(() => buildTopicBank(state.lessons), [state.lessons]);

  const stats = useMemo(() => progressStats(state), [state]);
  const selectedLesson = state.lessons.find((lesson) => lesson.id === selectedLessonId) || state.lessons[0];
  const selectedNewsItem = state.news?.items?.find((item) => item.id === selectedNewsId) || state.news?.items?.[0] || null;
  const aiContextLesson = state.lessons.find((lesson) => lesson.id === contextLessonId) || selectedLesson;

  function markCurrentStudied(current) {
    return {
      ...current,
      settings: markStudied(current.settings),
    };
  }

  function completeLesson(lessonId) {
    setState((current) => {
      const next = markCurrentStudied(current);
      return {
        ...next,
        reviews: {
          ...next.reviews,
          [lessonId]: markLessonComplete(next.reviews[lessonId]),
        },
      };
    });
  }

  function recordLessonQuestion(lessonId, isCorrect) {
    setState((current) => ({
      ...current,
      reviews: {
        ...current.reviews,
        [lessonId]: recordQuestionAnswer(current.reviews[lessonId], isCorrect),
      },
    }));
  }

  function startSession(lessonIds = recommendedLessons(state, 5).map((lesson) => lesson.id)) {
    const nextSession = {
      id: `session-${crypto.randomUUID()}`,
      startedAt: new Date().toISOString(),
      lessonIds,
      currentIndex: 0,
      results: { completed: 0 },
    };
    setSession(nextSession);
    setSelectedLessonId(lessonIds[0]);
    setContextLessonId(lessonIds[0]);
    setView('learn');
  }

  function completeCurrentLesson() {
    if (!selectedLesson) return;
    completeLesson(selectedLesson.id);

    if (!session) return;
    const nextResults = {
      ...session.results,
      completed: (session.results.completed || 0) + 1,
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
        `Session done. ${nextResults.completed} cards complete · streak ${projectedSettings.streakDays || 1} days.`,
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

  function saveLessonExpansion(key, expansion) {
    setState((current) => ({
      ...current,
      lessonExpansions: {
        ...(current.lessonExpansions || {}),
        [key]: {
          ...expansion,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }

  function recordItemActivity(itemKey, patch = {}) {
    setState((current) => {
      const existing = current.itemActivity?.[itemKey] || {
        itemKey,
        openCount: 0,
      };
      return {
        ...current,
        itemActivity: {
          ...(current.itemActivity || {}),
          [itemKey]: {
            ...existing,
            ...patch,
            openCount: patch.openCount ?? existing.openCount,
            updatedAt: patch.updatedAt || new Date().toISOString(),
          },
        },
      };
    });
  }

  function openCanonicalItem(itemKey, details = {}) {
    const route = resolveCanonicalItemRoute(state, itemKey);
    if (route.view === 'news') {
      setSelectedNewsId(route.newsId);
      setView('news');
      recordItemActivity(itemKey, {
        ...details,
        lastOpenedAt: new Date().toISOString(),
        openCount: (state.itemActivity?.[itemKey]?.openCount || 0) + 1,
      });
      return;
    }

    setSelectedLessonId(route.lessonId);
    setContextLessonId(route.lessonId);
    setView('learn');
    recordItemActivity(itemKey, {
      ...details,
      lastOpenedAt: new Date().toISOString(),
      openCount: (state.itemActivity?.[itemKey]?.openCount || 0) + 1,
    });
  }

  function toggleSavedItem(itemKey, options = {}) {
    setState((current) => {
      const exists = Boolean(current.savedItems?.[itemKey]);
      const nextSavedItems = { ...(current.savedItems || {}) };
      if (exists) delete nextSavedItems[itemKey];
      else {
        nextSavedItems[itemKey] = {
          itemKey,
          subjectIds: options.subjectIds || [],
          updatedAt: new Date().toISOString(),
        };
      }

      const { domain, newsId } = options;
      return {
        ...current,
        savedItems: nextSavedItems,
        news: domain === 'news'
          ? saveNewsItemState(current.news || createInitialNewsState(), newsId, !exists)
          : current.news,
      };
    });
  }

  function dismissItem(itemKey) {
    setState((current) => ({
      ...current,
      dismissedItems: {
        ...(current.dismissedItems || {}),
        [itemKey]: {
          itemKey,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }

  function toggleFollowTopic(topicId) {
    setState((current) => {
      const next = { ...(current.followedTopics || {}) };
      if (next[topicId]) delete next[topicId];
      else {
        next[topicId] = {
          topicId,
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        ...current,
        followedTopics: next,
      };
    });
  }

  async function refreshNews({ automatic = false } = {}) {
    if (newsStatus.refreshing) return;
    setNewsStatus({ refreshing: true, error: '' });
    try {
      const response = await fetch('/api/news-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: loadAiSettings().apiKey || '' }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error?.message
            || (response.status === 404 || response.status === 405
              ? 'Your private Leaderman server is out of date. Restart Leaderman.app or rerun npm run local:ai, then refresh News again.'
              : 'Could not refresh private news.'),
        );
      }
      if (!payload || !Array.isArray(payload.stories)) {
        throw new Error('Your private Leaderman server did not return a valid News response. Restart the private server and try again.');
      }
      setState((current) => ({
        ...current,
        news: mergeNewsRefresh(
          expireNewsItems(current.news || createInitialNewsState(), payload.refreshedAt),
          payload.stories || [],
          payload.refreshedAt,
        ),
      }));
      setNewsStatus({ refreshing: false, error: '' });
    } catch (error) {
      setNewsStatus({
        refreshing: false,
        error: automatic
          ? ''
          : error?.message === 'Failed to fetch'
            ? 'News refresh needs the Mac-hosted private server URL. A browser key alone is not enough on the public site.'
            : error.message,
      });
    }
  }

  async function expandNewsItem(newsItem) {
    const response = await fetch('/api/news-expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: newsItem, apiKey: loadAiSettings().apiKey || '' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || 'Could not expand this story.');
    setState((current) => ({
      ...current,
      news: saveNewsExpansionState(current.news || createInitialNewsState(), newsItem.id, {
        markdown: payload.markdown,
        structured: parseExpansionMarkdown(payload.markdown),
        updatedAt: new Date().toISOString(),
      }),
    }));
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

  const rememberFeedItem = useCallback((itemKey, lessonId = null) => {
    if (lessonId) setContextLessonId(lessonId);
    setState((current) =>
      withResume(current, {
        view: 'feed',
        feedLessonId: itemKey,
      }),
    );
  }, []);

  async function pullRemoteSnapshot() {
    const payload = await fetchSyncSnapshot();
    if (payload.snapshot) {
      setState((current) => mergeSyncSnapshot(current, payload.snapshot));
      setSyncStatus((current) => ({
        ...current,
        updatedAt: payload.snapshot.syncedAt || current.updatedAt,
        error: '',
      }));
    }
  }

  useEffect(() => {
    let cancelled = false;
    syncReadyRef.current = false;

    async function bootstrapSync() {
      try {
        const healthPayload = await fetchSyncHealth();
        if (cancelled) return;
        setSyncStatus({
          available: true,
          updatedAt: healthPayload.updatedAt || null,
          path: healthPayload.path || '',
          error: '',
          mode: healthPayload.mode || 'local',
          localUrl: healthPayload.localUrl || '',
          phoneUrls: healthPayload.phoneUrls || [],
          hostMode: healthPayload.hostMode || 'local',
        });
        if (!cancelled) await pullRemoteSnapshot();
      } catch (error) {
        if (!cancelled) {
          setSyncStatus({
            available: false,
            updatedAt: null,
            path: '',
            error: error.message,
            mode: 'local',
            localUrl: '',
            phoneUrls: [],
            hostMode: 'local',
          });
        }
      } finally {
        syncReadyRef.current = true;
      }
    }

    bootstrapSync();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!syncStatus.available) return undefined;

    const intervalId = window.setInterval(() => {
      pullRemoteSnapshot().catch(() => {});
    }, 45000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        pullRemoteSnapshot().catch(() => {});
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncStatus.available]);

  useEffect(() => {
    if (!syncStatus.available || !syncReadyRef.current) return undefined;
    const timeoutId = window.setTimeout(async () => {
      setIsSyncing(true);
      try {
        const snapshot = buildSyncSnapshot(state);
        const payload = await pushSyncSnapshot(snapshot);
        setSyncStatus((current) => ({
          ...current,
          updatedAt: payload.snapshot?.syncedAt || snapshot.syncedAt,
          error: '',
        }));
      } catch (error) {
        setSyncStatus((current) => ({
          ...current,
          error: error.message,
        }));
      } finally {
        setIsSyncing(false);
      }
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [state, syncStatus.available]);

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (!isNewsRefreshDue(state.news || createInitialNewsState(), new Date().toISOString())) return;
    if (newsAutoRefreshRef.current === todayKey) return;
    newsAutoRefreshRef.current = todayKey;
    refreshNews({ automatic: true });
  }, [state.news?.lastRefreshedAt]);

  const commonProps = {
    state,
    selectedLesson,
    selectedNewsItem,
    topicBank,
    libraryLessons,
    setSelectedLessonId,
    setSelectedNewsId,
    setContextLessonId,
    setView,
    startSession,
    completeLesson,
    completeCurrentLesson,
    recordLessonQuestion,
    saveReflection,
    saveLessonNote,
    saveReadingProgress,
    saveLessonExpansion,
    openCanonicalItem,
    toggleSavedItem,
    toggleFollowTopic,
    dismissItem,
    recordItemActivity,
    refreshNews,
    expandNewsItem,
    syncStatus,
    isSyncing,
    newsStatus,
    rememberFeedItem,
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
            <div className="topbar-actions">
              <button className="secondary-button" onClick={() => startSession()}>
                <Play size={16} />
                Session
              </button>
              <div
                className="sync-chip"
                title={syncStatus.available ? syncStatus.phoneUrls?.[0] || syncStatus.localUrl || syncStatus.path : syncStatus.error || 'No sync yet'}
              >
                {syncStatus.available ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{isSyncing ? 'Syncing' : syncStatus.phoneUrls?.length ? 'Phone ready' : syncStatus.available ? 'Mac sync' : 'Local only'}</span>
              </div>
            </div>
          </header>
        )}

        {sessionSummary && <div className="session-summary">{sessionSummary}</div>}
        {view === 'feed' && <FeedView {...commonProps} />}
        {view === 'learn' && <LearnView {...commonProps} />}
        {view === 'library' && <LibraryView {...commonProps} />}
        {view === 'novels' && <NovelsView {...commonProps} />}
        {view === 'news' && <NewsView {...commonProps} />}
        {view === 'progress' && <ProgressView {...commonProps} stats={stats} />}
      </main>

      <PhoneSetupLauncher syncStatus={syncStatus} isSyncing={isSyncing} />
      <AiSetupLauncher />
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

function FeedView({ state, completeLesson, recordLessonQuestion, saveReflection, openCanonicalItem, toggleSavedItem, dismissItem, recordItemActivity, rememberFeedItem }) {
  const [expandedId, setExpandedId] = useState(null);
  const [ratedCards, setRatedCards] = useState({});
  const feedIds = useMemo(() => buildFeedItems(state, { limit: 100 }).map((item) => item.key), [state]);
  const feedStackRef = useRef(null);
  const restoredFeedPosition = useRef(false);
  const rememberFrame = useRef(0);
  const feedItems = useMemo(() => {
    const itemsByKey = new Map(buildFeedItems(state, { limit: 120 }).map((item) => [item.key, item]));
    return feedIds.map((itemKey) => itemsByKey.get(itemKey)).filter(Boolean);
  }, [feedIds, state]);

  useEffect(() => {
    if (restoredFeedPosition.current) return;
    const resumeItemKey = state.settings?.resume?.feedLessonId;
    if (!resumeItemKey || !feedIds.includes(resumeItemKey)) return;

    const target = feedStackRef.current?.querySelector(`[data-feed-id="${resumeItemKey}"]`);
    if (!target) return;

    restoredFeedPosition.current = true;
    window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }, [feedIds, state.settings?.resume?.feedLessonId]);

  useEffect(() => {
    const stack = feedStackRef.current;
    if (!stack) return undefined;

    function rememberVisibleCard() {
      window.cancelAnimationFrame(rememberFrame.current);
      rememberFrame.current = window.requestAnimationFrame(() => {
        const cardHeight = Math.max(stack.clientHeight, 1);
        const index = Math.max(0, Math.min(feedItems.length - 1, Math.round(stack.scrollTop / cardHeight)));
        const item = feedItems[index];
        if (item) rememberFeedItem(item.key, item.lesson?.id || null);
      });
    }

    rememberVisibleCard();
    stack.addEventListener('scroll', rememberVisibleCard, { passive: true });
    return () => {
      window.cancelAnimationFrame(rememberFrame.current);
      stack.removeEventListener('scroll', rememberVisibleCard);
    };
  }, [feedItems, rememberFeedItem]);

  return (
    <section className="feed-view">
      <div className="feed-stack" ref={feedStackRef}>
        {feedItems.map((item) => (
          <FeedCard
            key={item.key}
            item={item}
            review={item.lesson ? state.reviews[item.lesson.id] : null}
            sources={item.lesson ? item.lesson.sourceIds.map((id) => sourceById(state, id)).filter(Boolean) : []}
            expansion={item.domain === 'news' ? state.news?.expansions?.[item.newsId] : null}
            expanded={expandedId === item.key}
            rated={ratedCards[item.key]}
            onExpand={() => {
              const nextId = expandedId === item.key ? null : item.key;
              setExpandedId(nextId);
              if (nextId) {
                recordItemActivity(item.key, {
                  subjectIds: item.subjectIds || [],
                  topicIds: item.topicIds || [],
                  domain: item.domain,
                  lastOpenedAt: new Date().toISOString(),
                  openCount: (state.itemActivity?.[item.key]?.openCount || 0) + 1,
                });
              }
            }}
            onComplete={() => {
              setRatedCards((current) => ({
                ...current,
                [item.key]: {
                  status: item.domain === 'news' ? 'saved' : 'complete',
                  label: item.domain === 'news' ? 'Saved' : 'Marked complete',
                },
              }));
              if (item.domain === 'news') {
                toggleSavedItem(item.key, {
                  domain: 'news',
                  newsId: item.newsId,
                  subjectIds: item.subjectIds || [],
                });
              } else {
                completeLesson(item.lesson.id);
              }
              window.setTimeout(() => {
                setRatedCards((current) => ({
                  ...current,
                  [item.key]: {
                    ...(current[item.key] || {}),
                    compact: true,
                  },
                }));
              }, 1500);
            }}
            onSkip={() => {
              dismissItem(item.key);
              setRatedCards((current) => ({
                ...current,
                [item.key]: { status: 'skip', label: 'Dismissed', compact: true },
              }));
            }}
            onRecordQuestion={(isCorrect) => item.lesson && recordLessonQuestion(item.lesson.id, isCorrect)}
            onSaveReflection={(text) => item.lesson && saveReflection(item.lesson.id, text)}
            onOpenFull={() => openCanonicalItem(item.key, { subjectIds: item.subjectIds || [], topicIds: item.topicIds || [], domain: item.domain })}
          />
        ))}
      </div>
    </section>
  );
}

function FeedCard({ item, review, sources, expansion, expanded, rated, onExpand, onComplete, onSkip, onRecordQuestion, onSaveReflection, onOpenFull }) {
  const lesson = item.lesson;
  const newsItem = item.newsItem;
  const badge = item.domain === 'news'
    ? { label: newsItem.status === 'saved' ? 'saved' : newsItem.priority || 'briefing', tone: newsItem.status === 'saved' ? 'complete' : 'new' }
    : progressBadge(review);
  const artwork = lesson
    ? feedArtwork(lesson, sources)
    : {
        mark: sourceInitials(newsItem.category || 'News'),
        sourceTitle: newsItem.sources?.[0]?.title || newsItem.category,
        sourceAuthor: newsItem.category,
        accent: '#7b8a96',
        secondary: '#46515a',
      };
  const summaryLesson = lesson ? isSummaryLesson(lesson) : false;
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
        onComplete();
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
      onComplete();
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
      <article className="feed-card rated-line" style={cardStyle} data-feed-id={item.key}>
        <div className="feed-backdrop" aria-hidden="true">
          <span className="feed-backdrop-mark">{artwork.mark}</span>
          <span className="feed-backdrop-source">
            <span>{artwork.sourceTitle}</span>
            <small>{artwork.sourceAuthor}</small>
          </span>
        </div>
        <div className="rated-line-content">
          <span>{item.title}</span>
          <small>{rated.status === 'complete' || rated.status === 'saved' ? 'saved' : 'dismissed'}</small>
        </div>
      </article>
    );
  }

  return (
    <article
      className={expanded ? 'feed-card expanded' : 'feed-card'}
      style={cardStyle}
      data-feed-id={item.key}
      tabIndex={0}
      onPointerDown={handleGestureStart}
      onPointerUp={handleGestureEnd}
      onKeyDown={handleGestureKeyDown}
      aria-label={`${item.title} feed card`}
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
          <span className="domain-tag">{item.domain === 'news' ? newsItem.category : lesson.domain}</span>
          <span className={`status-badge ${badge.tone}`}>{badge.label}</span>
        </div>
        <h2>{item.title}</h2>
        <p className="core-idea">{item.domain === 'news' ? newsItem.whatHappened : lesson.coreIdea}</p>
        <p className="source-line">{artwork.sourceTitle}</p>
        <p className="feed-reason">{item.reason}</p>
        {rated && <p className="rating-feedback">{rated.label}</p>}
        {!rated && (
          <button className="feed-complete-button" onClick={onComplete}>
            {item.domain === 'news' ? 'Save story' : 'Mark complete'}
          </button>
        )}

        {expanded && item.domain === 'news' && (
          <div className="feed-expanded">
            <InfoBlock title="Sources" text={(newsItem.sources || []).map((source) => source.title).join(' · ')} />
            {expansion ? (
              <GeneratedExpansion expansion={expansion} lesson={{ summaryKind: null }} title="Story briefing" />
            ) : (
              <>
                <InfoBlock title="Why it matters" text={newsItem.whyItMatters} />
                <InfoBlock title="What is known" text={newsItem.whatIsKnown} />
                <InfoBlock title="What is uncertain" text={newsItem.whatIsUncertain} />
              </>
            )}
            <button className="text-link" onClick={onOpenFull}>Open full story →</button>
          </div>
        )}

        {expanded && summaryLesson && (
          <SummaryLessonBody lesson={lesson} sources={sources} onOpenFull={onOpenFull} />
        )}

        {expanded && lesson && !summaryLesson && (
          <div className="feed-expanded">
            <InfoList title="Quick version" items={lesson.quickVersion || []} />
            <div className="article-body">
              {lesson.articleParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="two-column">
              <InfoList title="Break Down" items={lesson.breakDown || []} />
              <InfoList title="Remember" items={lesson.remember || []} />
            </div>
            <QuestionList questions={lesson.questions || []} />
            <div className="lesson-section">
              <h3>Scenario</h3>
              <p>{lesson.scenario}</p>
              <InfoBlock title="Practice rep" text={lesson.practiceRep} />
            </div>
            <DecisionOptions lesson={lesson} selected={decision} onSelect={setDecision} onAnswer={onRecordQuestion} />
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
      </div>
    </article>
  );
}

function DecisionOptions({ lesson, selected, onSelect, onAnswer }) {
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
              onClick={() => {
                if (!answered) onAnswer?.(option === lesson.preferredOption);
                onSelect(option);
              }}
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
      {lesson.coverImageUrl && (
        <div className="summary-hero-image">
          <img src={lesson.coverImageUrl} alt="" loading="lazy" />
        </div>
      )}
      <InfoList title="Quick version" items={lesson.quickVersion || lesson.summaryBullets || []} />
      <div className="article-body">
        {lesson.articleParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="two-column">
        <InfoList title="Key points" items={lesson.summaryBullets || []} />
        <InfoList title={lesson.summaryKind === 'History' ? 'Timeline' : 'Characters / structure'} items={lesson.timeline || []} />
      </div>
      <InfoList title={memoryTitleFor(lesson)} items={lesson.remember || lesson.themeNotes || []} />
      {lesson.reflectionLens && <InfoBlock title="Leadership reflection" text={lesson.reflectionLens} />}
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
  if (!items?.length) return null;
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

function QuestionList({ questions }) {
  if (!questions?.length) return null;
  return (
    <div className="lesson-section">
      <h3>Questions</h3>
      <div className="question-list">
        {questions.map((question) => (
          <div key={`${question.type}-${question.prompt}`} className="question-row">
            <span>{question.type}</span>
            <p>{question.prompt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpansionSection({ section }) {
  if (!section?.raw) return null;

  if (section.kind === 'questions') {
    return <QuestionList questions={section.questions || []} />;
  }

  if (section.kind === 'list' && section.items?.length) {
    return <InfoList title={section.heading} items={section.items} />;
  }

  if (section.kind === 'prose' && section.paragraphs?.length) {
    return (
      <div className="lesson-section">
        <h3>{section.heading}</h3>
        <div className="article-body">
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    );
  }

  return <InfoBlock title={section.heading} text={section.text || section.raw} />;
}

function GeneratedExpansion({ expansion, lesson, title }) {
  if (!expansion?.markdown) return null;
  const markdown = readingModeExpansionMarkdown(expansion.markdown, lesson);
  if (!markdown) return null;
  const structured = parseExpansionMarkdown(markdown);

  return (
    <div className="generated-expansion">
      <div className="generated-expansion-head">
        <span>{title || (isNovelReadingLesson(lesson) ? 'Full reader guide' : 'Full lesson')}</span>
        <small>{expansion.model ? `Generated with ${expansion.model}` : 'Generated privately'}</small>
      </div>
      <div className="generated-expansion-body">
        {structured.sections.map((section) => (
          <ExpansionSection key={`${section.key}-${section.raw.slice(0, 32)}`} section={section} />
        ))}
      </div>
    </div>
  );
}

function CompactSeedDetails({ title = 'Compact version', children }) {
  return (
    <details className="compact-seed">
      <summary>{title}</summary>
      <div className="compact-seed-body">
        {children}
      </div>
    </details>
  );
}

async function resolveExpansionAiTarget() {
  const settings = loadAiSettings();
  let serverStatus = 'offline';

  try {
    const response = await fetch('/api/ai-health');
    if (!response.ok) throw new Error('No local server');
    const payload = await response.json();
    serverStatus = payload.keyConfigured ? 'ready' : 'missing-key';
  } catch {
    serverStatus = 'offline';
  }

  if (serverStatus === 'missing-key') {
    throw new Error('Open AI Coach settings and save an OpenAI key to Keychain first.');
  }

  const endpoint = serverStatus === 'ready'
    ? DEFAULT_AI_SETTINGS.endpoint
    : settings.endpoint === DEFAULT_AI_SETTINGS.endpoint
      ? 'https://api.openai.com/v1/responses'
      : settings.endpoint;
  const needsKey = requiresClientApiKey(endpoint);
  const apiKey = needsKey ? settings.apiKey : '';

  if (needsKey && !apiKey) {
    throw new Error('Open AI Coach settings and save a browser key, or start the local AI server and save a Keychain key.');
  }

  return {
    apiKey,
    endpoint,
    model: settings.model,
  };
}

function ExpansionButton({ lesson, chapter = null, expansionKey, onSaveExpansion, label }) {
  const [isExpanding, setIsExpanding] = useState(false);
  const [error, setError] = useState('');

  async function runExpansion() {
    if (isExpanding) return;
    setIsExpanding(true);
    setError('');

    try {
      const target = await resolveExpansionAiTarget();
      const markdown = await expandLearningContent({
        ...target,
        lesson,
        chapter,
      });
      const safeMarkdown = readingModeExpansionMarkdown(markdown, lesson);
      onSaveExpansion(expansionKey, {
        lessonId: lesson.id,
        chapterId: chapter?.chapterId || chapter?.id || null,
        markdown: safeMarkdown,
        structured: parseExpansionMarkdown(safeMarkdown),
        model: target.model,
        source: 'ai-expansion',
      });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsExpanding(false);
    }
  }

  return (
    <div className="expansion-action">
      <button className="secondary-button" onClick={runExpansion} disabled={isExpanding}>
        <Sparkles size={16} />
        {isExpanding ? 'Expanding...' : label}
      </button>
      <small>Uses the AI Coach key settings.</small>
      {error && <p className="expansion-error">{error}</p>}
    </div>
  );
}

function ChapterReader({ lesson, chapters, currentIndex, progress, onSelectChapter, onCompleteChapter, lessonExpansions, onSaveExpansion }) {
  const currentChapter = chapters[currentIndex] || chapters[0];
  const novelReadingMode = isNovelReadingLesson(lesson);
  const completed = new Set(progress?.completedChapters || []);
  const completedCount = completed.size;
  const percent = Math.round((completedCount / chapters.length) * 100);
  const chapterExpansionKey = expansionKeyFor(lesson, currentChapter);
  const chapterExpansion = lessonExpansions?.[chapterExpansionKey];
  const chapterNoun = lesson.summaryKind === 'Novel' ? 'chapter retellings' : 'study sections';
  const chapterParagraphs = currentChapter.retellingParagraphs || currentChapter.retelling || currentChapter.summary?.split(/\n\s*\n/) || [];

  return (
    <div className="chapter-reader">
      <div className="chapter-reader-head">
        {lesson.coverImageUrl && (
          <div className="chapter-cover">
            <img src={lesson.coverImageUrl} alt="" loading="lazy" />
          </div>
        )}
        <div className="chapter-reader-title">
          <p className="reading-meta">
            Source basis: {lesson.sourceBasis.join(', ')} · {chapters.length} {chapterNoun}
          </p>
          <h3>{currentChapter.title}</h3>
          {lesson.collectionTitle && <p className="chapter-collection-tag">{lesson.collectionTitle}</p>}
        </div>
        <span>{completedCount}/{chapters.length} read</span>
      </div>

      <div className="chapter-progress" aria-label={`${percent}% read`}>
        <span style={{ width: `${percent}%` }} />
      </div>

      <div className="chapter-reader-layout">
        <div className="chapter-list" aria-label={`${lesson.title} ${chapterNoun}`}>
          {chapters.map((chapter, index) => {
            const hideFutureNovelTitle = lesson.summaryKind === 'Novel' && index > currentIndex && !completed.has(index);
            const rowNumber = chapter.displayNumber || (chapter.number ? `Ch ${chapter.number}` : `Ch ${index + 1}`);
            const rowTitle = hideFutureNovelTitle ? `Chapter ${chapter.number || index + 1}` : chapter.title.replace(/^Chapter \d+:\s*/, '');
            return (
              <button key={chapter.id || chapter.chapterId || `${lesson.id}-chapter-${index}`} className={index === currentIndex ? 'chapter-row active' : 'chapter-row'} onClick={() => onSelectChapter(index)}>
                <span>{completed.has(index) ? 'Read' : rowNumber}</span>
                <strong>{rowTitle}</strong>
              </button>
            );
          })}
        </div>

        <article className="chapter-card">
          {chapterExpansion ? (
            <>
              <GeneratedExpansion expansion={chapterExpansion} lesson={lesson} title={novelReadingMode ? 'Full chapter retelling' : 'Full study section'} />
              <CompactSeedDetails title={novelReadingMode ? 'Compact chapter version' : 'Original section seed'}>
                <div className="article-body">
                  {chapterParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="two-column">
                  <InfoBlock title="What changed" text={currentChapter.whatChanged} />
                  <InfoBlock title="Why it matters" text={currentChapter.whyItMatters} />
                </div>
                <div className="two-column">
                  <InfoList title={guideTitleFor(lesson)} items={currentChapter.breakDown || []} />
                  <InfoList title={memoryTitleFor(lesson)} items={currentChapter.remember || currentChapter.keyPoints || []} />
                </div>
                {lesson.reflectionLens && <InfoBlock title="Leadership reflection" text={lesson.reflectionLens} />}
                {!novelReadingMode && <QuestionList questions={currentChapter.questions || []} />}
              </CompactSeedDetails>
            </>
          ) : (
            <>
              <div className="article-body">
                {chapterParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <div className="two-column">
                <InfoBlock title="What changed" text={currentChapter.whatChanged} />
                <InfoBlock title="Why it matters" text={currentChapter.whyItMatters} />
              </div>
              <div className="two-column">
                <InfoList title={guideTitleFor(lesson)} items={currentChapter.breakDown || []} />
                <InfoList title={memoryTitleFor(lesson)} items={currentChapter.remember || currentChapter.keyPoints || []} />
              </div>
              {lesson.reflectionLens && <InfoBlock title="Leadership reflection" text={lesson.reflectionLens} />}
              {!novelReadingMode && <QuestionList questions={currentChapter.questions || []} />}
            </>
          )}
          <ExpansionButton
            lesson={lesson}
            chapter={currentChapter}
            expansionKey={chapterExpansionKey}
            onSaveExpansion={onSaveExpansion}
            label={chapterExpansion ? (lesson.summaryKind === 'Novel' ? 'Regenerate full chapter' : 'Regenerate full section') : (lesson.summaryKind === 'Novel' ? 'Expand chapter' : 'Expand section')}
          />
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

function LearnView({ state, selectedLesson, session, setSelectedLessonId, setContextLessonId, completeCurrentLesson, completeLesson, recordLessonQuestion, saveReflection, saveLessonNote, saveReadingProgress, saveLessonExpansion }) {
  const summaryLesson = isSummaryLesson(selectedLesson);
  const novelReadingMode = isNovelReadingLesson(selectedLesson);
  const savedReadingProgress = state.readingProgress?.[selectedLesson.id];
  const chapterSummaries = selectedLesson.chapterSummaries || [];
  const savedChapterIndex = Math.max(0, Math.min(chapterSummaries.length - 1, savedReadingProgress?.chapterIndex || 0));
  const lessonExpansionKey = expansionKeyFor(selectedLesson);
  const lessonExpansion = state.lessonExpansions?.[lessonExpansionKey];
  const [step, setStep] = useState(() => (summaryLesson ? 'summary' : 'article'));
  const [currentChapterIndex, setCurrentChapterIndex] = useState(savedChapterIndex);
  const [reflection, setReflection] = useState('');
  const [decision, setDecision] = useState('');
  const [showFidelity, setShowFidelity] = useState(false);
  const sources = selectedLesson.sourceIds.map((id) => sourceById(state, id)).filter(Boolean);
  const sessionProgress = session ? `${session.currentIndex + 1} / ${session.lessonIds.length}` : 'Solo lesson';
  const stepItems = summaryLesson
    ? novelReadingMode
      ? ['summary', 'overview', 'breakdown', 'notes']
      : ['summary', 'overview', 'breakdown', 'questions', 'notes']
    : ['article', 'breakdown', 'questions', 'scenario', 'decision', 'reflection'];

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
              {stepLabelFor(item, selectedLesson)}
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
            lessonExpansions={state.lessonExpansions || {}}
            onSaveExpansion={saveLessonExpansion}
          />
        )}

        {summaryLesson && step === 'summary' && chapterSummaries.length === 0 && (
          <div className="article-section">
            {selectedLesson.coverImageUrl && (
              <div className="summary-hero-image">
                <img src={selectedLesson.coverImageUrl} alt="" loading="lazy" />
              </div>
            )}
            <p className="reading-meta">
              Source basis: {selectedLesson.sourceBasis.join(', ')} · Type: {selectedLesson.summaryKind}
            </p>
            {lessonExpansion ? (
              <>
                <GeneratedExpansion expansion={lessonExpansion} lesson={selectedLesson} title={novelReadingMode ? 'Full reader guide' : 'Full summary'} />
                <CompactSeedDetails title={novelReadingMode ? 'Compact book version' : 'Original summary seed'}>
                  <div className="article-body">
                    {selectedLesson.articleParagraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {selectedLesson.summaryKind === 'Novel' && (
                    <InfoBlock
                      title="Chapter retellings"
                      text="True chapter retellings have not been authored for this book yet. Expand creates a private draft from the current study guide instead of showing fake chapter cards."
                    />
                  )}
                </CompactSeedDetails>
              </>
            ) : (
              <>
                <div className="article-body">
                  {selectedLesson.articleParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {selectedLesson.summaryKind === 'Novel' && (
                  <InfoBlock
                    title="Chapter retellings"
                    text="True chapter retellings have not been authored for this book yet. Expand creates a private draft from the current study guide instead of showing fake chapter cards."
                  />
                )}
              </>
            )}
            <ExpansionButton
              lesson={selectedLesson}
              expansionKey={lessonExpansionKey}
              onSaveExpansion={saveLessonExpansion}
              label={lessonExpansion ? (selectedLesson.summaryKind === 'Novel' ? 'Regenerate full guide' : 'Regenerate full summary') : (selectedLesson.summaryKind === 'Novel' ? 'Expand book guide' : 'Expand summary')}
            />
          </div>
        )}

        {summaryLesson && step === 'overview' && (
          <div className="article-section">
            {selectedLesson.coverImageUrl && (
              <div className="summary-hero-image">
                <img src={selectedLesson.coverImageUrl} alt="" loading="lazy" />
              </div>
            )}
            <p className="reading-meta">
              Source basis: {selectedLesson.sourceBasis.join(', ')} · Type: {selectedLesson.summaryKind}
            </p>
            {lessonExpansion ? (
              <>
                <GeneratedExpansion expansion={lessonExpansion} lesson={selectedLesson} title={novelReadingMode ? 'Full reader guide' : 'Full summary'} />
                <CompactSeedDetails title={novelReadingMode ? 'Compact book version' : 'Original summary seed'}>
                  <InfoList title="Quick version" items={selectedLesson.quickVersion || selectedLesson.summaryBullets || []} />
                  <div className="article-body">
                    {selectedLesson.articleParagraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <div className="two-column">
                    <InfoList title="Key points" items={selectedLesson.summaryBullets || []} />
                    <InfoList title={selectedLesson.summaryKind === 'History' ? 'Timeline' : 'Characters / structure'} items={selectedLesson.timeline || []} />
                  </div>
                  <InfoList title={memoryTitleFor(selectedLesson)} items={selectedLesson.remember || selectedLesson.themeNotes || []} />
                  {selectedLesson.reflectionLens && <InfoBlock title="Leadership reflection" text={selectedLesson.reflectionLens} />}
                </CompactSeedDetails>
              </>
            ) : (
              <>
                <InfoList title="Quick version" items={selectedLesson.quickVersion || selectedLesson.summaryBullets || []} />
                <div className="article-body">
                  {selectedLesson.articleParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="two-column">
                  <InfoList title="Key points" items={selectedLesson.summaryBullets || []} />
                  <InfoList title={selectedLesson.summaryKind === 'History' ? 'Timeline' : 'Characters / structure'} items={selectedLesson.timeline || []} />
                </div>
                <InfoList title={memoryTitleFor(selectedLesson)} items={selectedLesson.remember || selectedLesson.themeNotes || []} />
                {selectedLesson.reflectionLens && <InfoBlock title="Leadership reflection" text={selectedLesson.reflectionLens} />}
              </>
            )}
            <ExpansionButton
              lesson={selectedLesson}
              expansionKey={lessonExpansionKey}
              onSaveExpansion={saveLessonExpansion}
              label={lessonExpansion ? 'Regenerate full version' : 'Expand overview'}
            />
          </div>
        )}

        {summaryLesson && step === 'breakdown' && (
          <>
            <InfoList title={guideTitleFor(selectedLesson)} items={selectedLesson.breakDown || []} />
            {selectedLesson.reflectionLens && <InfoBlock title="Why it stays relevant" text={selectedLesson.reflectionLens} />}
          </>
        )}

        {summaryLesson && !novelReadingMode && step === 'questions' && <QuestionList questions={selectedLesson.questions || []} />}

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
            {lessonExpansion ? (
              <>
                <GeneratedExpansion expansion={lessonExpansion} lesson={selectedLesson} title="Full lesson" />
                <CompactSeedDetails title="Original lesson seed">
                  <InfoList title="Quick version" items={selectedLesson.quickVersion || []} />
                  <div className="article-body">
                    {selectedLesson.articleParagraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <div className="two-column">
                    <InfoBlock title="What it gets right" text={selectedLesson.whatItGetsRight} />
                    <InfoList title="Remember" items={selectedLesson.remember || []} />
                  </div>
                </CompactSeedDetails>
              </>
            ) : (
              <>
                <InfoList title="Quick version" items={selectedLesson.quickVersion || []} />
                <div className="article-body">
                  {selectedLesson.articleParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="two-column">
                  <InfoBlock title="What it gets right" text={selectedLesson.whatItGetsRight} />
                  <InfoList title="Remember" items={selectedLesson.remember || []} />
                </div>
              </>
            )}
            <ExpansionButton
              lesson={selectedLesson}
              expansionKey={lessonExpansionKey}
              onSaveExpansion={saveLessonExpansion}
              label={lessonExpansion ? 'Regenerate full lesson' : 'Expand lesson'}
            />
          </div>
        )}

        {!summaryLesson && step === 'breakdown' && <InfoList title="Break Down" items={selectedLesson.breakDown || []} />}

        {!summaryLesson && step === 'questions' && <QuestionList questions={selectedLesson.questions || []} />}

        {!summaryLesson && step === 'scenario' && (
          <div className="lesson-section">
            <h3>Scenario</h3>
            <p>{selectedLesson.scenario}</p>
            <InfoBlock title="Practice rep" text={selectedLesson.practiceRep} />
          </div>
        )}

        {!summaryLesson && step === 'decision' && (
          <DecisionOptions
            lesson={selectedLesson}
            selected={decision}
            onSelect={setDecision}
            onAnswer={(isCorrect) => recordLessonQuestion(selectedLesson.id, isCorrect)}
          />
        )}

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

        <div className="completion-bar">
          <button className="success-button" onClick={() => (session ? completeCurrentLesson() : completeLesson(selectedLesson.id))}>
            {session ? 'Complete & continue' : 'Mark complete'}
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

function LibraryView({ state, selectedLesson, libraryLessons, topicBank, openCanonicalItem, toggleFollowTopic }) {
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('leadership');
  const [subtopicId, setSubtopicId] = useState('all');
  const selectedSubject = topicBank.find((subject) => subject.id === subjectId) || topicBank.find((subject) => subject.lessonCount > 0) || topicBank[0];
  const visibleLessons = libraryLessons.filter((lesson) => {
    if (!selectedSubject) return true;
    const text = `${lesson.title} ${lesson.domain} ${lesson.coreIdea} ${(lesson.tags || []).join(' ')}`.toLowerCase();
    const matchesSubject = lesson.topicSubjectIds.includes(selectedSubject.id);
    const matchesSubtopic = subtopicId === 'all' || lesson.topicSubtopicIds.includes(subtopicId);
    return matchesSubject && matchesSubtopic && text.includes(query.toLowerCase());
  });
  const sourcePreview = state.sources
    .filter((source) => visibleLessons.some((lesson) => lesson.sourceIds.includes(source.id)))
    .slice(0, 5);

  useEffect(() => {
    if (!selectedSubject?.subtopics.some((subtopic) => subtopic.id === subtopicId)) {
      setSubtopicId('all');
    }
  }, [selectedSubject, subtopicId]);

  return (
    <section className="library-grid">
      <div className="library-main">
        <div className="search-row">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subjects, lessons, or tags" />
        </div>

        <div className="library-shelf-hero">
          <span className="library-shelf-icon">
            <Library size={20} />
          </span>
          <div className="library-shelf-copy">
            <p className="section-label">Subject map</p>
            <h2>{selectedSubject?.title}</h2>
            <p>{selectedSubject?.description}</p>
          </div>
          <button className={state.followedTopics?.[selectedSubject?.id] ? 'secondary-button active' : 'secondary-button'} onClick={() => toggleFollowTopic(selectedSubject.id)}>
            {state.followedTopics?.[selectedSubject?.id] ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {state.followedTopics?.[selectedSubject?.id] ? 'Following' : 'Follow subject'}
          </button>
        </div>

        <div className="domain-filter compact">
          <button key="all" className={subtopicId === 'all' ? 'active' : ''} onClick={() => setSubtopicId('all')}>
            All {selectedSubject?.title}
          </button>
          {selectedSubject?.subtopics.filter((subtopic) => subtopic.lessonCount > 0).map((subtopic) => (
            <button key={subtopic.id} className={subtopicId === subtopic.id ? 'active' : ''} onClick={() => setSubtopicId(subtopic.id)}>
              {subtopic.title}
            </button>
          ))}
        </div>

        <div className="library-section-head">
          <div>
            <p className="section-label">Curated study items</p>
            <h3>{selectedSubject?.title}</h3>
          </div>
          <span>{visibleLessons.length} cards</span>
        </div>

        <div className="library-list">
          {visibleLessons.map((lesson) => (
            <button
              key={lesson.id}
              className={selectedLesson.id === lesson.id ? 'library-row active' : 'library-row'}
              onClick={() => openCanonicalItem(canonicalItemKey('library', lesson.id), {
                subjectIds: lesson.topicSubjectIds,
                topicIds: lesson.topicSubtopicIds,
                domain: 'library',
              })}
            >
              {lesson.coverImageUrl && <img className="library-row-cover" src={lesson.coverImageUrl} alt="" loading="lazy" />}
              <div className="library-row-copy">
                <strong>{lesson.title}</strong>
                <p>{lesson.coreIdea}</p>
                <small>{lesson.topicSubtopicIds.length > 0 ? lesson.topicSubtopicIds.map(followLabel).join(' · ') : lesson.domain}</small>
              </div>
              <span className="library-row-meta">
                {lesson.summaryKind === 'History' ? 'History' : lesson.domain}
              </span>
            </button>
          ))}
        </div>
      </div>

      <aside className="source-list-panel library-context-panel">
        <p className="section-label">Subjects</p>
        <div className="shelf-breakdown">
          {topicBank.map((subject) => (
            <button key={subject.id} className={subject.id === selectedSubject?.id ? 'shelf-breakdown-row active' : 'shelf-breakdown-row'} onClick={() => setSubjectId(subject.id)}>
              <span>{subject.title}</span>
              <small>{subject.lessonCount} cards</small>
            </button>
          ))}
        </div>
        <div className="source-preview-head">
          <p className="section-label">Source preview</p>
          <span>{sourcePreview.length}</span>
        </div>
        {sourcePreview.map((source) => (
          <article key={source.id} className="source-card compact">
            <span>{source.domain}</span>
            <h3>{source.title}</h3>
            <small>{source.author}</small>
          </article>
        ))}
      </aside>
    </section>
  );
}

function NovelsView({ state, selectedLesson, openCanonicalItem, toggleSavedItem }) {
  const [query, setQuery] = useState('');
  const [collectionId, setCollectionId] = useState(null);
  const novelLessons = useMemo(() => state.lessons.filter((lesson) => lesson.summaryKind === 'Novel'), [state.lessons]);
  const collectionOptions = useMemo(() => {
    const map = new Map();
    novelLessons.forEach((lesson) => {
      const key = lesson.collectionId || lesson.slug;
      const current = map.get(key) || {
        id: key,
        title: lesson.collectionTitle || lesson.title,
        description: lesson.collectionDescription || lesson.coreIdea,
        imageUrl: lesson.collectionImageUrl || lesson.coverImageUrl || null,
        count: 0,
        order: lesson.collectionOrder || 999,
      };
      current.count += 1;
      map.set(key, current);
    });
    return [...map.values()].sort((left, right) => (left.order - right.order) || left.title.localeCompare(right.title));
  }, [novelLessons]);
  const selectedCollection = collectionOptions.find((item) => item.id === collectionId) || collectionOptions[0] || null;
  const filteredLessons = novelLessons.filter((lesson) => {
    const text = `${lesson.title} ${lesson.coreIdea} ${(lesson.tags || []).join(' ')}`.toLowerCase();
    const inCollection = !selectedCollection || lesson.collectionId === selectedCollection.id;
    return inCollection && text.includes(query.toLowerCase());
  });

  useEffect(() => {
    if (!collectionOptions.some((item) => item.id === collectionId)) {
      setCollectionId(collectionOptions[0]?.id || null);
    }
  }, [collectionId, collectionOptions]);

  return (
    <section className="library-grid">
      <div className="library-main">
        <div className="search-row">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books, characters, or themes" />
        </div>

        <div className="library-shelf-hero">
          <span className="library-shelf-icon">
            <BookOpen size={20} />
          </span>
          <div className="library-shelf-copy">
            <p className="section-label">Reading shelf</p>
            <h2>{selectedCollection?.title || 'Novels'}</h2>
            <p>{selectedCollection?.description || 'Reading-oriented study guides, chapter companions, and private expansions.'}</p>
          </div>
          {selectedCollection?.imageUrl && (
            <div className="library-shelf-art">
              <img src={selectedCollection.imageUrl} alt="" loading="lazy" />
            </div>
          )}
        </div>

        <div className="collection-strip" aria-label="Novel collections">
          {collectionOptions.map((collection) => (
            <button key={collection.id} className={selectedCollection?.id === collection.id ? 'collection-chip active' : 'collection-chip'} onClick={() => setCollectionId(collection.id)}>
              {collection.imageUrl && <img src={collection.imageUrl} alt="" loading="lazy" />}
              <div>
                <strong>{collection.title}</strong>
                <small>{collection.count} items</small>
              </div>
            </button>
          ))}
        </div>

        <div className="library-list">
          {filteredLessons.map((lesson) => {
            const reading = state.readingProgress?.[lesson.id];
            const itemKey = canonicalItemKey('novels', lesson.id);
            const saved = Boolean(state.savedItems?.[itemKey]);
            return (
              <button key={lesson.id} className={selectedLesson.id === lesson.id ? 'library-row active' : 'library-row'} onClick={() => openCanonicalItem(itemKey, {
                subjectIds: ['novels'],
                topicIds: ['novels'],
                domain: 'novels',
              })}>
                {lesson.coverImageUrl && <img className="library-row-cover" src={lesson.coverImageUrl} alt="" loading="lazy" />}
                <div className="library-row-copy">
                  <strong>{lesson.title}</strong>
                  <p>{lesson.coreIdea}</p>
                  <small>{lesson.chapterSummaries?.length ? `${reading ? `Chapter ${reading.chapterIndex + 1}` : `${lesson.chapterSummaries.length} chapters`} · ${saved ? 'Saved' : 'Reader guide ready'}` : saved ? 'Saved' : 'Overview ready'}</small>
                </div>
                <span className="library-row-meta">
                  <button
                    className="icon-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleSavedItem(itemKey, {
                        subjectIds: ['novels'],
                        domain: 'novels',
                      });
                    }}
                    title={saved ? 'Unsave' : 'Save'}
                  >
                    {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  </button>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="source-list-panel library-context-panel">
        <p className="section-label">Shelf note</p>
        {selectedCollection && (
          <article className="source-card compact collection-context-card">
            <span>Novels</span>
            <h3>{selectedCollection.title}</h3>
            <p>{selectedCollection.description}</p>
            <small>{filteredLessons.length} reading items</small>
          </article>
        )}
      </aside>
    </section>
  );
}

function NewsView({ state, selectedNewsItem, setSelectedNewsId, newsStatus, refreshNews, expandNewsItem, toggleSavedItem }) {
  const [query, setQuery] = useState('');
  const [expandingId, setExpandingId] = useState('');
  const freshness = describeNewsFreshness(state.news || createInitialNewsState(), new Date().toISOString());
  const stories = (state.news?.items || []).filter((item) => {
    const text = `${item.title} ${item.category} ${item.whatHappened}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });
  const selectedStory = selectedNewsItem || stories[0] || null;
  const expansion = selectedStory ? state.news?.expansions?.[selectedStory.id] : null;

  async function handleExpand(story) {
    if (!story || expandingId) return;
    setExpandingId(story.id);
    try {
      await expandNewsItem(story);
    } finally {
      setExpandingId('');
    }
  }

  return (
    <section className="library-grid">
      <div className="library-main">
        <div className="search-row">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search briefings, categories, or entities" />
        </div>

        <div className="library-shelf-hero">
          <span className="library-shelf-icon">
            <Newspaper size={20} />
          </span>
          <div className="library-shelf-copy">
            <p className="section-label">Private briefing room</p>
            <h2>Daily news</h2>
            <p>Compact real-source briefings first, deeper analysis only when you explicitly expand a story.</p>
            <small className={freshness.stale ? 'news-refresh-note stale' : 'news-refresh-note'}>
              {newsStatus.refreshing ? 'Refreshing now...' : freshness.label}
            </small>
          </div>
          <button className="secondary-button" onClick={() => refreshNews()} disabled={newsStatus.refreshing}>
            <RefreshCw size={16} />
            {newsStatus.refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="library-list">
          {stories.length === 0 && (
            <article className="source-card compact collection-context-card">
              <span>Unavailable</span>
              <h3>No private briefing yet</h3>
              <p>{newsStatus.error || 'Open the private local server to refresh the daily briefing. The public site stays usable without it.'}</p>
            </article>
          )}
          {stories.map((story) => {
            const saved = Boolean(state.savedItems?.[canonicalItemKey('news', story.id)]);
            return (
              <button key={story.id} className={selectedStory?.id === story.id ? 'library-row active' : 'library-row'} onClick={() => setSelectedNewsId(story.id)}>
                <div className="library-row-copy">
                  <strong>{story.title}</strong>
                  <p>{story.whatHappened}</p>
                  <small>{story.sources?.map((source) => source.title).join(' · ')}</small>
                </div>
                <span className="library-row-meta">
                  {story.category}
                  <small>{saved ? 'Saved' : story.priority}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="source-list-panel library-context-panel">
        {selectedStory ? (
          <>
            <article className="source-card compact collection-context-card">
              <span>{selectedStory.category}</span>
              <h3>{selectedStory.title}</h3>
              <p>{selectedStory.whatHappened}</p>
              <small>{selectedStory.sources?.map((source) => source.title).join(' · ')}</small>
            </article>
            <div className="ai-settings-actions">
              <button className="secondary-button" onClick={() => toggleSavedItem(canonicalItemKey('news', selectedStory.id), {
                domain: 'news',
                newsId: selectedStory.id,
                subjectIds: [selectedStory.category.toLowerCase().replace(/\s+/g, '-')],
              })}>
                {state.savedItems?.[canonicalItemKey('news', selectedStory.id)] ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {state.savedItems?.[canonicalItemKey('news', selectedStory.id)] ? 'Saved' : 'Save'}
              </button>
              <button className="secondary-button" onClick={() => handleExpand(selectedStory)} disabled={expandingId === selectedStory.id}>
                <Sparkles size={16} />
                {expandingId === selectedStory.id ? 'Expanding...' : expansion ? 'Regenerate detail' : 'Expand detail'}
              </button>
            </div>
            {expansion ? (
              <GeneratedExpansion expansion={expansion} lesson={{ summaryKind: null }} title="Story detail" />
            ) : (
              <>
                <InfoBlock title="Why it matters" text={selectedStory.whyItMatters} />
                <InfoBlock title="What is known" text={selectedStory.whatIsKnown} />
                <InfoBlock title="What is uncertain" text={selectedStory.whatIsUncertain} />
                <InfoBlock title="What to watch" text={selectedStory.whatToWatch} />
              </>
            )}
          </>
        ) : (
          <p className="empty-copy">Select a story to read the full briefing.</p>
        )}
      </aside>
    </section>
  );
}

function ProgressView({ state, stats, startSession }) {
  return (
    <section className="progress-grid">
      <div className="progress-hero">
        <p className="section-label">Local progress</p>
        <div className="progress-metrics">
          <Metric label="Complete" value={`${stats.completionPercent}%`} />
          <Metric label="Questions right" value={stats.questionAccuracy === null ? '-' : `${stats.questionAccuracy}%`} />
          <Metric label="Cards complete" value={stats.completed} />
        </div>
        <button className="primary-button" onClick={() => startSession()}>
          <Play size={16} />
          Continue
        </button>
      </div>

      <div className="signal-panel">
        <p className="section-label">Question record</p>
        <div className="weak-row">
          <span>Answered</span>
          <small>{stats.questionAttempts}</small>
        </div>
        <div className="weak-row">
          <span>Correct</span>
          <small>{stats.correctAnswers}</small>
        </div>
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

function PhoneSetupLauncher({ syncStatus, isSyncing }) {
  const [open, setOpen] = useState(false);
  const phoneUrl = syncStatus.phoneUrls?.[0] || '';

  async function copyPhoneUrl() {
    if (!phoneUrl || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(phoneUrl);
    } catch {
      // Ignore clipboard failures. The user can still read the URL.
    }
  }

  return (
    <>
      <button className="sync-setup-button" onClick={() => setOpen(true)}>
        <Smartphone size={16} />
        <span>Phone</span>
      </button>
      {open && <button className="ai-scrim" onClick={() => setOpen(false)} aria-label="Close phone setup" />}
      {open && (
        <aside className="sync-setup-modal" aria-label="Phone setup">
          <div className="floating-ai-head">
            <div>
              <span>Phone setup</span>
              <strong>Use your Mac as the home base</strong>
            </div>
            <button className="icon-button light" onClick={() => setOpen(false)} title="Close">
              <X size={16} />
            </button>
          </div>
          <div className="ai-settings-drawer">
            <div className={`server-status ${syncStatus.available ? 'ready' : 'offline'}`}>
              <span>{phoneUrl ? 'Phone sync is ready' : syncStatus.available ? 'Mac sync is ready' : 'Sync offline'}</span>
              <p>
                {phoneUrl
                  ? 'Your Mac is serving Leaderman to the local network. Open the phone address below on the same Wi-Fi and the phone will share the same saved state, News, and AI bridge.'
                  : syncStatus.available
                    ? 'Leaderman is syncing on this Mac, but there is no phone-ready network address yet. Open Leaderman.app or run the LAN server so your phone can reach it.'
                    : 'No Mac sync server is available right now. The app is still working locally on this device.'}
              </p>
            </div>

            {phoneUrl && (
              <div className="ai-field">
                <label htmlFor="phone-url">Phone address</label>
                <input id="phone-url" value={phoneUrl} readOnly />
                <div className="ai-settings-actions">
                  <button className="secondary-button" onClick={copyPhoneUrl}>
                    Copy address
                  </button>
                </div>
                <p className="field-help">On your phone: open this address in Safari on the same Wi-Fi, then add it to the Home Screen if you want a shortcut.</p>
              </div>
            )}

            <p className="settings-notice">
              {isSyncing
                ? 'Sync is running now.'
                : syncStatus.available
                  ? syncStatus.updatedAt
                    ? `Last synced at ${new Date(syncStatus.updatedAt).toLocaleString()}. Keep the Mac awake while using the phone.`
                    : 'Sync is connected.'
                  : syncStatus.error || 'Open Leaderman.app on your Mac to turn on phone sync.'}
            </p>
          </div>
        </aside>
      )}
    </>
  );
}

function AiSetupLauncher() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadAiSettings());
  const [draftKey, setDraftKey] = useState(() => loadAiSettings().apiKey);
  const [notice, setNotice] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');
  const [canSaveKeychain, setCanSaveKeychain] = useState(false);
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

  function refreshServerStatus() {
    setServerStatus('checking');
    fetch('/api/ai-health')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('No local server'))))
      .then((payload) => {
        setCanSaveKeychain(Boolean(payload.canSaveKeychain));
        setServerStatus(payload.keyConfigured ? 'ready' : 'missing-key');
      })
      .catch(() => {
        setCanSaveKeychain(false);
        setServerStatus('offline');
      });
  }

  useEffect(() => {
    if (!open) return;
    const latest = loadAiSettings();
    setSettings(latest);
    setDraftKey(latest.apiKey);
    setNotice('');
    refreshServerStatus();
  }, [open]);

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

  return (
    <>
      <button className="ai-setup-button" onClick={() => setOpen(true)}>
        <Settings size={16} />
        <span>API key</span>
      </button>
      {open && <button className="ai-scrim" onClick={() => setOpen(false)} aria-label="Close API key setup" />}
      {open && (
        <aside className="ai-setup-modal" aria-label="AI setup">
          <div className="floating-ai-head">
            <div>
              <span>AI setup</span>
              <strong>Keys and model settings</strong>
            </div>
            <button className="icon-button light" onClick={() => setOpen(false)} title="Close">
              <X size={16} />
            </button>
          </div>
          <div className="ai-settings-drawer">
            <div className={`server-status ${serverStatus}`}>
              <span>{serverStatus === 'ready' ? 'Private server ready' : serverStatus === 'missing-key' ? 'Key needed' : 'Browser key mode'}</span>
              <p>
                {serverStatus === 'ready'
                  ? 'Your Mac server will make the API call.'
                  : serverStatus === 'missing-key'
                    ? canSaveKeychain
                      ? 'Save a key to Keychain on this Mac.'
                      : 'The Mac server is running, but the key must be saved from the Mac itself.'
                    : 'No private server was found, so the browser will call OpenAI directly.'}
              </p>
            </div>
            {serverStatus !== 'offline' && canSaveKeychain && (
              <div className="ai-field">
                <label htmlFor="launcher-keychain-key">Save key to Mac Keychain</label>
                <input
                  id="launcher-keychain-key"
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
                  <label htmlFor="launcher-ai-key">OpenAI API key</label>
                  <input
                    id="launcher-ai-key"
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
              <label htmlFor="launcher-ai-model">Model</label>
              <select id="launcher-ai-model" value={modelSelectValue} onChange={(event) => updateModelSelection(event.target.value)}>
                {AI_MODEL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
                <option value="custom">Custom model</option>
              </select>
              <p className="field-help">{selectedModelOption?.description || 'Use this for a newer or account-specific model ID.'}</p>
            </div>
            {modelSelectValue === 'custom' && (
              <div className="ai-field">
                <label htmlFor="launcher-ai-custom-model">Custom model ID</label>
                <input id="launcher-ai-custom-model" value={settings.model} onChange={(event) => updateSettings({ ...settings, model: event.target.value.trim() })} placeholder="gpt-..." />
              </div>
            )}
            <details>
              <summary>Advanced endpoint</summary>
              <div className="ai-field">
                <label htmlFor="launcher-ai-endpoint">Endpoint</label>
                <input id="launcher-ai-endpoint" value={settings.endpoint} onChange={(event) => updateSettings({ ...settings, endpoint: event.target.value })} />
              </div>
            </details>
            {notice && <p className="settings-notice">{notice}</p>}
          </div>
        </aside>
      )}
    </>
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
  const [canSaveKeychain, setCanSaveKeychain] = useState(false);
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
      .then((payload) => {
        setCanSaveKeychain(Boolean(payload.canSaveKeychain));
        setServerStatus(payload.keyConfigured ? 'ready' : 'missing-key');
      })
      .catch(() => {
        setCanSaveKeychain(false);
        setServerStatus('offline');
      });
  }

  useEffect(() => refreshServerStatus(), []);

  useEffect(() => {
    if (!open) return;
    const latest = loadAiSettings();
    setSettings(latest);
    setDraftKey(latest.apiKey);
    refreshServerStatus();
  }, [open]);

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
              <p>
                {serverStatus === 'ready'
                  ? 'Your Mac server will make the API call.'
                  : serverStatus === 'missing-key'
                    ? canSaveKeychain
                      ? 'Save a key to Keychain on this Mac.'
                      : 'The Mac server is running, but the key must be saved from the Mac itself.'
                    : 'The local server was not found, so the browser will call OpenAI directly.'}
              </p>
            </div>
            {serverStatus !== 'offline' && canSaveKeychain && (
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
        ...(lesson.summaryKind === 'History' && lesson.reflectionLens ? [['Leadership reflection', lesson.reflectionLens]] : []),
        ['Source note', lesson.fidelityNote],
      ]
    : [
        ['Source basis', lesson.sourceBasis.join(', ')],
        ['History lens', lesson.historicalExample?.title || 'General leadership history'],
        ['Analogy', lesson.historicalExample?.analogy || 'Pattern matched to context.'],
        ['Caution', lesson.ethicsCheck],
        ['Source note', lesson.fidelityNote],
      ].filter(([, text]) => Boolean(text));
  return (
    <div className="fidelity-panel">
      <p className="section-label">Source notes</p>
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
  if (!text) return null;
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
