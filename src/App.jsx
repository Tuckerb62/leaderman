import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Brain,
  ChevronRight,
  Cloud,
  Download,
  FileUp,
  HelpCircle,
  Layers,
  Library,
  LineChart,
  MessageCircle,
  Play,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { clearApiKey, loadAiSettings, saveAiSettings, saveApiKey } from './data/aiSettings.js';
import { createInitialState, domains, philosophySchools } from './data/seedData.js';
import {
  articleByKey,
  articleFeedPathLabel,
  articleBySlug,
  articleHierarchy,
  humanizeLiteratureLabel,
  articlePathLabel,
  articles,
  calculateArticleProgress,
  getSubjectProgress,
  interestSubjectHierarchy,
  getSubtopicProgress,
  getTopicProgress,
  searchArticles,
} from './data/articleCatalog.js';
import { trimAiChatMessages, trimReflections, trimSessions } from './data/stateLimits.js';
import { exportState, loadState, parseImportedState, saveState } from './data/storage.js';
import { buildLibraryLessonIndex, buildTopicBank } from './data/topicBank.js';
import { buildSyncSnapshot, mergeSyncSnapshot } from './data/syncState.js';
import { createSupabaseAccount, getSupabaseSessionState, onSupabaseAuthStateChange, sendPasswordResetEmail, signInSupabaseWithPassword, signOutSupabase, updateSupabasePassword } from './logic/supabaseAuth.js';
import { isSupabaseConfigured } from './utils/supabase.js';
import { AI_MODEL_OPTIONS, DEFAULT_AI_SETTINGS, askArticleTutor, askOpenAI, expandArticleFromMarkdown, expandLearningContent, validateApiKey } from './logic/aiClient.js';
import { parseExpansionMarkdown } from './logic/expansionMapper.js';
import { buildFeedItems } from './logic/feedAggregation.js';
import { canonicalItemKey } from './logic/itemIdentity.js';
import { resolveCanonicalItemRoute } from './logic/itemRouting.js';
import { isLessonComplete, markLessonComplete, recordQuestionAnswer } from './logic/reviewScheduler.js';
import { fetchSyncHealth, fetchSyncSnapshot, pushSyncSnapshot } from './logic/syncClient.js';
import { BookReader, MarkdownBlock } from './components/BookReader.jsx';
import { GeneratedLessonView } from './components/GeneratedLessonView.jsx';
import { buildArticlePages, buildLessonPages } from './logic/lessonPages.js';
import { slotById, slotsForSubject } from './data/lessonSlots.js';
import { fetchGeneratedLessons, loadGeneratedLessonsCache } from './logic/generatedLessons.js';
import { feedQueue, progressStats, recommendedLessons, sourceById } from './logic/selectors.js';
import { markStudied, sessionMinutes } from './logic/studyProgress.js';


const navItems = [
  { id: 'feed', label: 'Feed', icon: Layers },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'novels', label: 'Literature', icon: BookOpen },
  { id: 'progress', label: 'Progress', icon: LineChart },
  { id: 'account', label: 'Account', icon: Settings },
];

const visibleViews = new Set(navItems.map((item) => item.id));
const addressableViews = new Set([...visibleViews, 'learn', 'article']);

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
    title: 'Literature',
    description: 'Classic literature and judgment practice grounded in the markdown library.',
    domains: ['Literature'],
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

function normalizePrimaryView(view) {
  if (view === 'novels') return 'library';
  return view;
}

function initialView(state) {
  const requestedView = normalizePrimaryView(queryParam('view'));
  const requestedLesson = queryParam('lesson');
  const requestedArticle = queryParam('article');
  if (requestedArticle) return 'article';
  if (requestedLesson) return 'learn';
  if (addressableViews.has(requestedView)) return requestedView;
  const resumeView = normalizePrimaryView(state.settings?.resume?.view);
  return addressableViews.has(resumeView) ? resumeView : 'feed';
}

function initialLibrarySubjectId(state) {
  return state.settings?.resume?.librarySubjectId || 'leadership';
}

function initialLessonId(state) {
  const requestedLesson = queryParam('lesson');
  const matchingLesson = state.lessons.find((lesson) => lesson.slug === requestedLesson || lesson.id === requestedLesson);
  const resumeLesson = state.lessons.find((lesson) => lesson.id === state.settings?.resume?.lessonId);
  return matchingLesson?.id || resumeLesson?.id || recommendedLessons(state, 1)[0]?.id;
}

function initialArticleKey(state) {
  const requestedArticle = queryParam('article');
  if (requestedArticle) {
    const article = articleBySlug[requestedArticle] || articleByKey[requestedArticle];
    if (article) return article.key;
  }
  const resumeArticle = articleByKey[state.settings?.resume?.articleKey];
  return resumeArticle?.key || articles[0]?.key || null;
}

function viewTitle(view) {
  return {
    feed: 'Feed',
    learn: 'Detail',
    article: 'Article',
    library: 'Library',
    novels: 'Literature',
    progress: 'Progress',
    account: 'Account',
  }[view];
}

function syncStatusLabel(syncStatus, isSyncing) {
  if (isSyncing) return 'Syncing';
  if (syncStatus.configured && !syncStatus.authenticated) return 'Sign in to sync';
  if (syncStatus.error) return 'Sync issue';
  if (syncStatus.available) return 'Synced';
  return 'Local only';
}

function formatDateLine() {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}

function CuriosityMark({ className = 'curiosity-mark' }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img">
        <path d="M47 16c-3-3-8-5-14-5-11 0-19 8-19 21s8 21 19 21c6 0 11-2 14-5" />
        <path d="M28 25c1-2 4-4 7-4 4 0 7 3 7 6 0 4-4 6-6 8-1 1-2 2-2 4" />
        <path d="M34 44h.01" />
      </svg>
    </span>
  );
}

const overviewCards = [
  {
    title: 'Feed',
    text: 'Open the app, read what surfaces, put it down. Lessons read like book chapters and remember your page.',
  },
  {
    title: 'Library',
    text: 'Leadership, philosophy, politics, science, history, literature, medicine. Topics nobody has opened yet can be written into existence.',
  },
  {
    title: 'Tutor',
    text: 'The floating bubble. It knows what you are reading and can quiz you, run a scenario, or help you think.',
  },
];

function OverviewContent() {
  return (
    <div className="overview-content">
      <div className="overview-hero">
        <CuriosityMark className="curiosity-mark large" />
        <div>
          <h1>Curiosity</h1>
          <p>A calm nightly reading app. Your progress, notes, and place in every book follow you between devices.</p>
        </div>
      </div>
      <div className="overview-card-grid">
        {overviewCards.map((card) => (
          <article key={card.title} className="overview-card">
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
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
  'World History': { mark: 'WH', accent: '#b09a6d', secondary: '#685334' },
};

function displayLessonTitle(state, lessonId) {
  if (!lessonId) return 'General';
  return state.lessons.find((lesson) => lesson.id === lessonId)?.title || 'General';
}

function followLabel(topicId = '') {
  return topicId.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function countSelectedInterestNodes(nodes = [], followedTopics = {}) {
  return nodes.reduce((total, node) => {
    const current = followedTopics?.[node.id] ? 1 : 0;
    return total + current + countSelectedInterestNodes(node.children || [], followedTopics);
  }, 0);
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
    librarySubjectId: currentResume.librarySubjectId || 'leadership',
    updatedAt: currentResume.updatedAt || null,
    ...patch,
  };
  const unchanged =
    currentResume.view === nextResume.view &&
    currentResume.lessonId === nextResume.lessonId &&
    currentResume.articleKey === nextResume.articleKey &&
    currentResume.feedLessonId === nextResume.feedLessonId &&
    currentResume.librarySubjectId === nextResume.librarySubjectId;

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
  const [authState, setAuthState] = useState({
    checking: true,
    configured: isSupabaseConfigured(),
    user: null,
    error: '',
  });
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [view, setView] = useState(() => initialView(state));
  const [librarySubjectId, setLibrarySubjectId] = useState(() => initialLibrarySubjectId(state));
  const [selectedLessonId, setSelectedLessonId] = useState(() => initialLessonId(state));
  const [selectedArticleKey, setSelectedArticleKey] = useState(() => initialArticleKey(state));
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [sharedLessons, setSharedLessons] = useState(() => loadGeneratedLessonsCache());
  const [session, setSession] = useState(null);
  const [sessionSummary, setSessionSummary] = useState('');
  const [contextLessonId, setContextLessonId] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    available: false,
    updatedAt: null,
    path: '',
    error: '',
    mode: 'supabase',
    configured: false,
    authenticated: false,
    requiresSignIn: false,
    userEmail: '',
    userId: '',
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const syncReadyRef = useRef(false);
  const deviceAccountId = authState.user?.id || null;
  const overviewSeen = deviceAccountId
    ? Boolean(state.settings?.onboarding?.overviewSeenByUserId?.[deviceAccountId])
    : false;

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    setState((current) =>
      withResume(current, {
        view,
        lessonId: selectedLessonId || null,
        articleKey: selectedArticleKey || null,
        librarySubjectId,
      }),
    );
  }, [view, selectedLessonId, selectedArticleKey, librarySubjectId]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthState() {
      if (!isSupabaseConfigured()) {
        setAuthState({
          checking: false,
          configured: false,
          user: null,
          error: '',
        });
        return;
      }

      try {
        const sessionState = await getSupabaseSessionState();
        if (!cancelled) {
          setAuthState({
            checking: false,
            configured: true,
            user: sessionState.user,
            error: '',
          });
        }
      } catch (error) {
        if (!cancelled) {
          setAuthState({
            checking: false,
            configured: true,
            user: null,
            error: error.message,
          });
        }
      }
    }

    const unsubscribe = onSupabaseAuthStateChange(({ event, user }) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      setAuthState({
        checking: false,
        configured: true,
        user,
        error: '',
      });
    });

    loadAuthState();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authState.user) return;
    fetchGeneratedLessons()
      .then(setSharedLessons)
      .catch(() => {});
  }, [authState.user]);

  const libraryLessons = useMemo(() => buildLibraryLessonIndex(state.lessons), [state.lessons]);
  const topicBank = useMemo(() => buildTopicBank(state.lessons), [state.lessons]);

  const stats = useMemo(() => progressStats(state), [state]);
  const selectedLesson = state.lessons.find((lesson) => lesson.id === selectedLessonId) || state.lessons[0];
  const selectedArticle = articleByKey[selectedArticleKey] || articles[0] || null;
  const aiContextLesson = state.lessons.find((lesson) => lesson.id === contextLessonId) || selectedLesson;
  const selectedSharedLesson = selectedSlotId ? sharedLessons[selectedSlotId] : null;
  const aiContext = view === 'article' && selectedArticle
    ? {
        title: selectedArticle.title,
        domain: selectedArticle.subject,
        coreIdea: selectedArticle.summary || '',
        sourceBasis: [selectedArticle.sourceFile].filter(Boolean),
        scenario: '',
        practiceRep: '',
        reviewPrompt: '',
      }
    : view === 'generated' && selectedSharedLesson
      ? {
          title: selectedSharedLesson.title,
          domain: slotById(selectedSlotId)?.subject || 'Library',
          coreIdea: selectedSharedLesson.openingLine || '',
          sourceBasis: ['Shared library lesson'],
          scenario: '',
          practiceRep: '',
          reviewPrompt: '',
        }
      : aiContextLesson;
  const showFloatingAi = view === 'learn' || view === 'article' || (view === 'generated' && Boolean(selectedSharedLesson));

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
          sessions: trimSessions([finished, ...next.sessions]),
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
        reflections: trimReflections([
          {
            id: `reflection-${crypto.randomUUID()}`,
            lessonId,
            text: text.trim(),
            createdAt: new Date().toISOString(),
          },
          ...next.reflections,
        ]),
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
      noteUpdatedAtByKey: {
        ...(current.noteUpdatedAtByKey || {}),
        [lessonId]: new Date().toISOString(),
      },
    }));
  }

  function saveAiChatMessages(messages) {
    setState((current) => ({
      ...current,
      aiChatMessages: trimAiChatMessages(messages),
    }));
  }

  function clearAiChatMessages() {
    setState((current) => ({
      ...current,
      aiChatMessages: [],
    }));
  }

  function setArticleCompletion(articleKey, completed = true) {
    setState((current) => {
      const next = completed ? markCurrentStudied(current) : current;
      const updatedAt = new Date().toISOString();
      return {
        ...next,
        completedArticlesByKey: {
          ...(next.completedArticlesByKey || {}),
          [articleKey]: {
            articleKey,
            completed,
            completedAt: completed ? (next.completedArticlesByKey?.[articleKey]?.completedAt || updatedAt) : null,
            updatedAt,
          },
        },
      };
    });
  }

  function saveGeneratedArticle(articleKey, generatedArticle) {
    setState((current) => ({
      ...current,
      generatedArticlesByKey: {
        ...(current.generatedArticlesByKey || {}),
        [articleKey]: {
          ...generatedArticle,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }

  function saveArticleTutorThread(articleKey, messages) {
    setState((current) => ({
      ...current,
      articleTutorThreadsByKey: {
        ...(current.articleTutorThreadsByKey || {}),
        [articleKey]: {
          messages,
          updatedAt: new Date().toISOString(),
        },
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

  function savePagePosition(bookKey, pageIndex) {
    setState((current) => {
      const existing = current.readingProgress?.[bookKey] || {};
      const turnedForward = pageIndex > (existing.pageIndex || 0);
      return {
        ...current,
        settings: turnedForward
          ? {
              ...current.settings,
              studyStats: {
                ...(current.settings?.studyStats || {}),
                pagesTurned: (current.settings?.studyStats?.pagesTurned || 0) + 1,
              },
            }
          : current.settings,
        readingProgress: {
          ...(current.readingProgress || {}),
          [bookKey]: {
            ...existing,
            bookKey,
            pageIndex,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  function saveReaderSettings(patch) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        reader: {
          ...(current.settings?.reader || {}),
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
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
    if (itemKey.startsWith('generated:')) {
      setSelectedSlotId(itemKey.slice('generated:'.length));
      setView('generated');
      recordItemActivity(itemKey, {
        ...details,
        lastOpenedAt: new Date().toISOString(),
        openCount: (state.itemActivity?.[itemKey]?.openCount || 0) + 1,
      });
      return;
    }

    const route = resolveCanonicalItemRoute(state, itemKey);
    if (route.view === 'article') {
      setSelectedArticleKey(route.articleKey);
      setView('article');
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
          topicIds: options.topicIds || [],
          updatedAt: new Date().toISOString(),
        };
      }

      const { domain } = options;
      return {
        ...current,
        savedItems: nextSavedItems,
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

  async function importBackup(file) {
    if (!file) return;
    const text = await file.text();
    setState(parseImportedState(text));
  }

  function resetLocalData() {
    if (window.confirm('Reset all local Curiosity progress, notes, and reflections on this device?')) {
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

  const refreshSyncStatus = useCallback(async () => {
    syncReadyRef.current = false;
    const healthPayload = await fetchSyncHealth();

    setSyncStatus({
      available: healthPayload.available || false,
      updatedAt: healthPayload.updatedAt || null,
      path: healthPayload.path || '',
      error: healthPayload.error || '',
      mode: 'supabase',
      configured: healthPayload.configured || false,
      authenticated: healthPayload.authenticated || false,
      requiresSignIn: healthPayload.requiresSignIn || false,
      userEmail: healthPayload.userEmail || '',
      userId: healthPayload.userId || '',
    });

    if (healthPayload.available) {
      await pullRemoteSnapshot();
    }

    syncReadyRef.current = true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSync() {
      try {
        await refreshSyncStatus();
      } catch (error) {
        if (!cancelled) {
          setSyncStatus((current) => ({
            ...current,
            available: false,
            error: error.message,
          }));
          syncReadyRef.current = true;
        }
      }
    }

    const unsubscribe = onSupabaseAuthStateChange(() => {
      if (cancelled) return;
      refreshSyncStatus().catch((error) => {
        if (!cancelled) {
          setSyncStatus((current) => ({
            ...current,
            available: false,
            error: error.message,
          }));
          syncReadyRef.current = true;
        }
      });
    });

    bootstrapSync();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refreshSyncStatus]);

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

  const commonProps = {
    state,
    selectedLesson,
    selectedArticle,
    topicBank,
    libraryLessons,
    setSelectedLessonId,
    setContextLessonId,
    setView,
    startSession,
    completeLesson,
    setArticleCompletion,
    completeCurrentLesson,
    recordLessonQuestion,
    saveReflection,
    saveLessonNote,
    saveReadingProgress,
    savePagePosition,
    saveReaderSettings,
    saveLessonExpansion,
    saveGeneratedArticle,
    saveArticleTutorThread,
    openCanonicalItem,
    toggleSavedItem,
    toggleFollowTopic,
    dismissItem,
    recordItemActivity,
    saveProfileUsername,
    syncStatus,
    isSyncing,
    rememberFeedItem,
    sharedLessons,
    session,
    librarySubjectId,
    setLibrarySubjectId,
  };

  function markOverviewSeen() {
    if (!deviceAccountId) return;
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        onboarding: {
          ...(current.settings?.onboarding || {}),
          overviewSeenByUserId: {
            ...(current.settings?.onboarding?.overviewSeenByUserId || {}),
            [deviceAccountId]: new Date().toISOString(),
          },
        },
        resume: {
          ...(current.settings?.resume || {}),
          view: 'feed',
          updatedAt: new Date().toISOString(),
        },
      },
    }));
    setView('feed');
  }

  function saveProfileUsername(username) {
    const cleanUsername = username.trim();
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        profile: {
          ...(current.settings?.profile || {}),
          username: cleanUsername,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }

  if (authState.checking) {
    return <AuthLoadingScreen />;
  }

  if (passwordRecovery && authState.user) {
    return <PasswordRecoveryScreen onDone={() => setPasswordRecovery(false)} />;
  }

  if (!authState.configured || !authState.user) {
    return (
      <AuthGate
        authState={authState}
        onAuthenticated={(user) => setAuthState({
          checking: false,
          configured: true,
          user,
          error: '',
        })}
      />
    );
  }

  if (!overviewSeen) {
    return (
      <OverviewScreen
        initialUsername={state.settings?.profile?.username || ''}
        onSaveUsername={saveProfileUsername}
        onContinue={markOverviewSeen}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" aria-label="Curiosity">
          <CuriosityMark className="curiosity-mark brand-mark" />
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id || (item.id === 'library' && view === 'library') ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  if (item.id === 'novels') {
                    setLibrarySubjectId('literature');
                    setView('library');
                    return;
                  }
                  setView(item.id);
                }}
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
        {view !== 'feed' && view !== 'learn' && view !== 'article' && view !== 'generated' && (
          <header className="topbar">
            <div>
              <p className="date-line">{formatDateLine()}</p>
              <h1>{viewTitle(view)}</h1>
            </div>
            <div className="topbar-actions">
              <button
                className="sync-chip"
                onClick={() => setView('account')}
                title={syncStatus.available ? syncStatus.path : syncStatus.error || 'Open Account'}
              >
                {syncStatus.available ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{syncStatusLabel(syncStatus, isSyncing)}</span>
              </button>
            </div>
          </header>
        )}

        {sessionSummary && <div className="session-summary">{sessionSummary}</div>}
        {view === 'feed' && <FeedView {...commonProps} />}
        {view === 'learn' && <LearnView {...commonProps} />}
        {view === 'article' && <ArticleDetailView {...commonProps} />}
        {view === 'library' && <LibraryView {...commonProps} />}
        {view === 'generated' && (
          <GeneratedLessonView
            slot={slotById(selectedSlotId)}
            lesson={sharedLessons[selectedSlotId] || null}
            completed={Boolean(state.completedArticlesByKey?.[`generated:${selectedSlotId}`]?.completed)}
            onComplete={() => setArticleCompletion(`generated:${selectedSlotId}`, true)}
            position={state.readingProgress?.[`generated:${selectedSlotId}`]?.pageIndex || 0}
            onPosition={(pageIndex) => savePagePosition(`generated:${selectedSlotId}`, pageIndex)}
            readerSettings={state.settings?.reader}
            onReaderSettings={saveReaderSettings}
            onPublished={(slotId, lesson) => setSharedLessons((current) => ({ ...current, [slotId]: lesson }))}
          />
        )}
        {view === 'progress' && <ProgressView {...commonProps} stats={stats} />}
        {view === 'account' && <AccountView {...commonProps} />}
      </main>
      {showFloatingAi && (
        <FloatingAiPanel
          lesson={aiContext}
          messages={state.aiChatMessages || []}
          onSaveMessages={saveAiChatMessages}
          onClearMessages={clearAiChatMessages}
        />
      )}
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <CuriosityMark className="curiosity-mark large" />
        <p className="section-label">Curiosity</p>
        <h1>Checking your session</h1>
        <p>One moment while Curiosity checks whether this device is signed in.</p>
      </section>
    </main>
  );
}

function AuthGate({ authState, onAuthenticated }) {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState(authState.error || '');
  const [submitting, setSubmitting] = useState(false);
  const creating = mode === 'create';

  async function submitAuth(event) {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password || submitting) return;

    setSubmitting(true);
    setNotice('');
    try {
      const result = creating
        ? await createSupabaseAccount(cleanEmail, password)
        : await signInSupabaseWithPassword(cleanEmail, password);
      if (result.user && result.session) onAuthenticated(result.user);
      else setNotice('Check your email to confirm the account, then sign in here.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function requestPasswordReset() {
    if (submitting) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setNotice('Enter your email above first, then tap "Forgot password?" again.');
      return;
    }

    setSubmitting(true);
    setNotice('');
    try {
      await sendPasswordResetEmail(cleanEmail);
      setNotice('Reset email sent. Open the link on this device to choose a new password. It can take a few minutes and may land in spam.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!authState.configured) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <CuriosityMark className="curiosity-mark large" />
          <p className="section-label">Online sync setup needed</p>
          <h1>Connect Supabase for this web app</h1>
          <p>The desktop Curiosity app is the API/key home base. The online/PWA version needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` so signed-in devices can remember their account and sync.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <CuriosityMark className="curiosity-mark large" />
        <p className="section-label">Curiosity</p>
        <h1>{creating ? 'Create your account' : 'Sign in'}</h1>
        <p>{creating ? 'Make a private Curiosity profile so this device can sync progress from the desktop/API home base.' : 'Welcome back. This device will remember your account and sync your Curiosity state.'}</p>

        <form className="auth-form" onSubmit={submitAuth}>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={creating ? 'new-password' : 'current-password'}
            placeholder="At least 6 characters"
          />
          <button className="primary-button" type="submit" disabled={!email.trim() || !password || submitting}>
            {submitting ? 'Working...' : creating ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="auth-links">
          <button
            className="link-button"
            onClick={() => {
              setMode(creating ? 'sign-in' : 'create');
              setNotice('');
            }}
          >
            {creating ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          </button>
          {!creating && (
            <button className="link-button" onClick={requestPasswordReset} disabled={submitting}>
              Forgot password?
            </button>
          )}
        </div>
        {notice && <p className="settings-notice">{notice}</p>}
      </section>
    </main>
  );
}

function PasswordRecoveryScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitNewPassword(event) {
    event.preventDefault();
    if (submitting) return;
    if (password !== confirm) {
      setNotice('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    setNotice('');
    try {
      await updateSupabasePassword(password);
      onDone();
    } catch (error) {
      setNotice(error.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <CuriosityMark className="curiosity-mark large" />
        <p className="section-label">Curiosity</p>
        <h1>Choose a new password</h1>
        <p>You followed a reset link, so this device can set a new password for your account.</p>

        <form className="auth-form" onSubmit={submitNewPassword}>
          <label htmlFor="recovery-password">New password</label>
          <input
            id="recovery-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />
          <label htmlFor="recovery-confirm">Repeat it</label>
          <input
            id="recovery-confirm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            placeholder="Same password again"
          />
          <button className="primary-button" type="submit" disabled={!password || !confirm || submitting}>
            {submitting ? 'Saving...' : 'Save new password'}
          </button>
        </form>
        {notice && <p className="settings-notice">{notice}</p>}
      </section>
    </main>
  );
}

function OverviewScreen({ initialUsername = '', onSaveUsername, onContinue }) {
  const [username, setUsername] = useState(initialUsername);

  function continueWithUsername() {
    onSaveUsername?.(username);
    onContinue();
  }

  return (
    <main className="auth-shell overview-shell">
      <section className="overview-panel">
        <OverviewContent />
        <div className="onboarding-username">
          <label htmlFor="onboarding-username">Username</label>
          <input
            id="onboarding-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="What should Curiosity call you?"
            autoComplete="nickname"
          />
          <p className="field-help">This is saved in your synced profile, so your other signed-in devices remember it too.</p>
        </div>
        <button className="primary-button" onClick={continueWithUsername}>Start learning</button>
      </section>
    </main>
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

function FeedView({ state, completeLesson, setArticleCompletion, openCanonicalItem, toggleSavedItem, dismissItem, rememberFeedItem, sharedLessons }) {
  const [ratedCards, setRatedCards] = useState({});
  const generatedLessons = useMemo(() => Object.values(sharedLessons || {}), [sharedLessons]);
  const feedIds = useMemo(() => buildFeedItems(state, { limit: 100, generatedLessons }).map((item) => item.key), [state, generatedLessons]);
  const feedStackRef = useRef(null);
  const restoredFeedPosition = useRef(false);
  const rememberFrame = useRef(0);
  const feedItems = useMemo(() => {
    const itemsByKey = new Map(buildFeedItems(state, { limit: 120, generatedLessons }).map((item) => [item.key, item]));
    return feedIds.map((itemKey) => itemsByKey.get(itemKey)).filter(Boolean);
  }, [feedIds, state, generatedLessons]);

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
            rated={ratedCards[item.key]}
            onComplete={() => {
              setRatedCards((current) => ({
                ...current,
                [item.key]: { status: 'complete', label: 'Finished' },
              }));
              if (item.domain === 'article' || item.domain === 'generated') {
                setArticleCompletion(item.key, true);
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
            onOpenFull={() => openCanonicalItem(item.key, { subjectIds: item.subjectIds || [], topicIds: item.topicIds || [], domain: item.domain })}
          />
        ))}
      </div>
    </section>
  );
}

function FeedCard({ item, review, rated, onComplete, onSkip, onOpenFull }) {
  const lesson = item.lesson;
  const openingLine = item.domain === 'library' ? lesson.coreIdea : item.summary;
  const finished = item.domain === 'library' ? Boolean(review?.completed) : Boolean(item.completed);
  const gesture = useRef({ startX: 0, startY: 0 });

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
      startX: event.clientX,
      startY: event.clientY,
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

    if (distance < 12) {
      onOpenFull();
    }
  }

  function handleGestureKeyDown(event) {
    if (isInteractiveTarget(event.target)) return;
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
      onOpenFull();
    }
  }

  if (rated?.compact) {
    return (
      <article className="feed-card rated-line" data-feed-id={item.key}>
        <div className="rated-line-content">
          <span>{item.title}</span>
          <small>{rated.status === 'skip' ? 'dismissed' : 'saved'}</small>
        </div>
      </article>
    );
  }

  return (
    <article
      className="feed-card"
      data-feed-id={item.key}
      tabIndex={0}
      onPointerDown={handleGestureStart}
      onPointerUp={handleGestureEnd}
      onKeyDown={handleGestureKeyDown}
      aria-label={item.title}
    >
      <div className="feed-card-content">
        <h2>{item.title}</h2>
        <p className="core-idea">{openingLine}</p>
        {(rated || finished) && <p className="feed-state">{rated?.label || 'Finished'}</p>}
      </div>
    </article>
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

  if (!settings.apiKey) {
    throw new Error('Open Account and save your OpenAI API key first.');
  }

  return {
    apiKey: settings.apiKey,
    endpoint: DEFAULT_AI_SETTINGS.endpoint,
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

function LearnView({ state, selectedLesson, session, setContextLessonId, completeCurrentLesson, completeLesson, saveLessonNote, saveReadingProgress, savePagePosition, saveReaderSettings, saveLessonExpansion }) {
  const savedReadingProgress = state.readingProgress?.[selectedLesson.id];
  const chapterSummaries = selectedLesson.chapterSummaries || [];
  const savedChapterIndex = Math.max(0, Math.min(chapterSummaries.length - 1, savedReadingProgress?.chapterIndex || 0));
  const lessonExpansionKey = expansionKeyFor(selectedLesson);
  const lessonExpansion = state.lessonExpansions?.[lessonExpansionKey];
  const [currentChapterIndex, setCurrentChapterIndex] = useState(savedChapterIndex);
  const review = state.reviews?.[selectedLesson.id];
  const completed = Boolean(review?.completed);
  const pages = useMemo(
    () => buildLessonPages(selectedLesson, lessonExpansion),
    [selectedLesson, lessonExpansion],
  );

  useEffect(() => {
    setCurrentChapterIndex(Math.max(0, Math.min((selectedLesson.chapterSummaries || []).length - 1, state.readingProgress?.[selectedLesson.id]?.chapterIndex || 0)));
    setContextLessonId(selectedLesson.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLesson.id, setContextLessonId]);

  function selectChapter(index, markComplete = false) {
    setCurrentChapterIndex(index);
    saveReadingProgress(selectedLesson.id, index, markComplete);
  }

  function completeCurrentChapter() {
    const nextIndex = Math.min(chapterSummaries.length - 1, currentChapterIndex + 1);
    selectChapter(nextIndex, true);
  }

  if (chapterSummaries.length > 0) {
    return (
      <section className="reader-view">
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
        <NoteBox note={state.notes[selectedLesson.id] || ''} onSave={(note) => saveLessonNote(selectedLesson.id, note)} />
      </section>
    );
  }

  return (
    <section className="reader-view">
      <BookReader
        bookKey={selectedLesson.id}
        kicker={selectedLesson.domain}
        title={selectedLesson.title}
        pages={pages}
        position={savedReadingProgress?.pageIndex || 0}
        onPosition={(pageIndex) => savePagePosition(selectedLesson.id, pageIndex)}
        completed={completed}
        onComplete={() => (session ? completeCurrentLesson() : completeLesson(selectedLesson.id))}
        completeLabel={session ? 'Finished, continue' : 'Finished'}
        readerSettings={state.settings?.reader}
        onReaderSettings={saveReaderSettings}
        footer={[selectedLesson.sourceBasis?.join(', '), selectedLesson.fidelityNote].filter(Boolean).join(' — ')}
      />
      <div className="reader-quiet-actions">
        <ExpansionButton
          lesson={selectedLesson}
          expansionKey={lessonExpansionKey}
          onSaveExpansion={saveLessonExpansion}
          label={lessonExpansion ? 'Rewrite the expanded lesson' : 'Expand this lesson'}
        />
      </div>
      <NoteBox note={state.notes[selectedLesson.id] || ''} onSave={(note) => saveLessonNote(selectedLesson.id, note)} />
    </section>
  );
}
function progressLabel(progress) {
  return `${progress.completed}/${progress.total} · ${progress.percent}%`;
}

function ProgressRing({ progress, visible }) {
  const safeTotal = Math.max(progress?.total || 0, 1);
  const percent = Math.max(0, Math.min(100, Math.round(((progress?.completed || 0) / safeTotal) * 100)));
  const label = `${progress.completed}/${progress.total}`;
  const densityClass = label.length >= 9 ? 'expanded' : label.length >= 7 ? 'compact' : '';
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - ((percent / 100) * circumference);

  return (
    <span className={visible ? `tree-progress visible ${densityClass}`.trim() : `tree-progress ${densityClass}`.trim()}>
      {visible && (
        <svg className="tree-progress-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle className="tree-progress-track" cx="18" cy="18" r={radius} />
          <circle
            className="tree-progress-value"
            cx="18"
            cy="18"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
      )}
      <small>{label}</small>
    </span>
  );
}

function ArticleDetailView({
  state,
  selectedArticle,
  setArticleCompletion,
  saveLessonNote,
  saveGeneratedArticle,
  toggleSavedItem,
  savePagePosition,
  saveReaderSettings,
}) {
  const [isExpandingArticle, setIsExpandingArticle] = useState(false);
  const [expansionError, setExpansionError] = useState('');
  const generated = selectedArticle ? state.generatedArticlesByKey?.[selectedArticle.key] : null;
  const pages = useMemo(
    () => (selectedArticle ? buildArticlePages(selectedArticle, generated) : []),
    [selectedArticle, generated],
  );

  if (!selectedArticle) {
    return (
      <section className="reader-view">
        <p className="empty-copy">No article is selected.</p>
      </section>
    );
  }

  const completed = Boolean(state.completedArticlesByKey?.[selectedArticle.key]?.completed);
  const saved = Boolean(state.savedItems?.[selectedArticle.key]);
  const isLiterature = selectedArticle.articleType === 'literature';
  const savedPosition = state.readingProgress?.[selectedArticle.key]?.pageIndex || 0;

  async function runArticleExpansion() {
    if (isExpandingArticle) return;
    setIsExpandingArticle(true);
    setExpansionError('');
    try {
      const target = await resolveExpansionAiTarget();
      const generatedArticle = await expandArticleFromMarkdown({
        ...target,
        article: selectedArticle,
      });
      saveGeneratedArticle(selectedArticle.key, {
        ...generatedArticle,
        model: target.model,
        source: 'article-ai-expansion',
      });
    } catch (error) {
      setExpansionError(error.message);
    } finally {
      setIsExpandingArticle(false);
    }
  }

  return (
    <section className="reader-view">
      <BookReader
        bookKey={selectedArticle.key}
        kicker={selectedArticle.hierarchyPath.join(' · ')}
        title={isLiterature ? humanizeLiteratureLabel(selectedArticle.title) : selectedArticle.title}
        pages={pages}
        position={savedPosition}
        onPosition={(pageIndex) => savePagePosition(selectedArticle.key, pageIndex)}
        completed={completed}
        onComplete={() => setArticleCompletion(selectedArticle.key, true)}
        readerSettings={state.settings?.reader}
        onReaderSettings={saveReaderSettings}
        footer={selectedArticle.sourceFile}
      />
      <div className="reader-quiet-actions">
        <button
          className={saved ? 'secondary-button active' : 'secondary-button'}
          onClick={() => toggleSavedItem(selectedArticle.key, {
            domain: 'article',
            subjectIds: [selectedArticle.subjectId],
            topicIds: [selectedArticle.subjectId, selectedArticle.topicId, selectedArticle.subtopicId, selectedArticle.subsubtopicId].filter(Boolean),
          })}
        >
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {saved ? 'Saved' : 'Save'}
        </button>
        <button
          className="secondary-button"
          onClick={runArticleExpansion}
          disabled={isExpandingArticle}
        >
          <Sparkles size={16} />
          {isExpandingArticle ? 'Expanding...' : generated ? 'Rewrite the expanded article' : 'Expand this article'}
        </button>
      </div>
      {expansionError && <p className="error-text">{expansionError}</p>}
      <NoteBox note={state.notes[selectedArticle.key] || ''} onSave={(note) => saveLessonNote(selectedArticle.key, note)} />
    </section>
  );
}

// Path label for a literature book, dropping the subject (first segment) and the
// book title (last segment), plus the redundant "chapter-by-chapter" grouping node.
function literatureBookPathLabel(article) {
  const path = article.hierarchyPath.slice(1, -1).filter(Boolean);
  if (path[0]?.toLowerCase().includes('chapter-by-chapter')) {
    return path.slice(1).join(': ');
  }
  return path.join(': ');
}

// Chapter title with its leading "Book Title: " prefix removed for the in-book list.
function literatureChapterLabel(article, bookRawTitle) {
  let label = String(article.title || '');
  if (bookRawTitle && label.startsWith(`${bookRawTitle}: `)) {
    label = label.slice(bookRawTitle.length + 2);
  }
  return humanizeLiteratureLabel(label.trim());
}

// Group a flat list of literature chapter articles into their parent books,
// preserving first-seen (source) order for both books and chapters.
function groupLiteratureBooks(articleList) {
  const map = new Map();
  for (const article of articleList) {
    if (article.articleType !== 'literature') continue;
    const bookKey = article.hierarchyPath.join('|');
    const bookRawTitle = article.hierarchyPath.at(-1) || article.title;
    const group = map.get(bookKey) || {
      bookKey,
      bookRawTitle,
      bookTitle: humanizeLiteratureLabel(bookRawTitle),
      pathLabel: literatureBookPathLabel(article),
      chapters: [],
    };
    group.chapters.push(article);
    map.set(bookKey, group);
  }
  return [...map.values()];
}

function LibraryView({ state, selectedArticle, openCanonicalItem, toggleFollowTopic, librarySubjectId, setLibrarySubjectId, sharedLessons }) {
  const treePanelRef = useRef(null);
  const [query, setQuery] = useState('');
  const [treeOpen, setTreeOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(librarySubjectId || 'leadership');
  const [topicId, setTopicId] = useState('all');
  const [subtopicId, setSubtopicId] = useState('all');
  const [subsubtopicId, setSubsubtopicId] = useState('all');
  const [expandedBooks, setExpandedBooks] = useState(() => new Set());
  const selectedSubject = articleHierarchy.find((subject) => subject.id === subjectId) || articleHierarchy[0];
  const selectedTopic = selectedSubject?.topics.find((topic) => topic.id === topicId) || null;
  const selectedSubtopic = selectedTopic?.subtopics.find((subtopic) => subtopic.id === subtopicId) || null;
  const selectedSubsubtopic = selectedSubtopic?.subsubtopics.find((item) => item.id === subsubtopicId) || null;
  const selectedPath = [selectedSubject?.title, selectedTopic?.title, selectedSubtopic?.title, selectedSubsubtopic?.title].filter(Boolean);
  const baseArticles = query.trim()
    ? searchArticles(query).filter((article) => article.subjectId === selectedSubject?.id)
    : articles.filter((article) => article.subjectId === selectedSubject?.id);
  const visibleArticles = baseArticles.filter((article) => {
    const matchesTopic = topicId === 'all' || article.topicId === topicId;
    const matchesSubtopic = subtopicId === 'all' || article.subtopicId === subtopicId;
    const matchesSubsubtopic = subsubtopicId === 'all' || article.subsubtopicId === subsubtopicId;
    return matchesTopic && matchesSubtopic && matchesSubsubtopic;
  });
  const subjectProgress = getSubjectProgress(selectedSubject?.id, state.completedArticlesByKey || {});
  const scopeTitle = selectedSubsubtopic?.title || selectedSubtopic?.title || selectedTopic?.title || selectedSubject?.title;
  const scopeProgress = selectedSubtopic
    ? getSubtopicProgress(selectedSubject.id, selectedTopic.id, selectedSubtopic.id, state.completedArticlesByKey || {})
    : selectedTopic
      ? getTopicProgress(selectedSubject.id, selectedTopic.id, state.completedArticlesByKey || {})
      : subjectProgress;
  const completedArticlesByKey = state.completedArticlesByKey || {};
  const standardArticles = visibleArticles.filter((article) => article.articleType !== 'literature');
  const literatureBooks = groupLiteratureBooks(visibleArticles);
  // A search expands every book so matching chapters are visible without extra taps.
  const expandAllBooks = Boolean(query.trim());

  function toggleBook(bookKey) {
    setExpandedBooks((current) => {
      const next = new Set(current);
      if (next.has(bookKey)) next.delete(bookKey);
      else next.add(bookKey);
      return next;
    });
  }

  useEffect(() => {
    setTopicId('all');
    setSubtopicId('all');
    setSubsubtopicId('all');
    setExpandedBooks(new Set());
  }, [subjectId]);

  useEffect(() => {
    if (librarySubjectId && librarySubjectId !== subjectId) {
      setSubjectId(librarySubjectId);
    }
  }, [librarySubjectId, subjectId]);

  useEffect(() => {
    setSubtopicId('all');
    setSubsubtopicId('all');
  }, [topicId]);

  useEffect(() => {
    setSubsubtopicId('all');
  }, [subtopicId]);

  useEffect(() => {
    if (!treeOpen) return undefined;

    function handlePointerDown(event) {
      if (!treePanelRef.current?.contains(event.target)) {
        setTreeOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setTreeOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [treeOpen]);

  function selectSubject(nextSubjectId) {
    setSubjectId(nextSubjectId);
    setLibrarySubjectId(nextSubjectId);
    setTreeOpen(true);
  }

  function selectTopic(nextTopicId) {
    setTopicId(nextTopicId);
    setTreeOpen(true);
  }

  function selectSubtopic(nextSubtopicId) {
    setSubtopicId(nextSubtopicId);
    setTreeOpen(true);
  }

  function selectSubsubtopic(nextSubsubtopicId) {
    setSubsubtopicId(nextSubsubtopicId);
    setTreeOpen(true);
  }

  function progressForBranch(filters) {
    return calculateArticleProgress(
      articles.filter((article) => {
        if (filters.subjectId && article.subjectId !== filters.subjectId) return false;
        if (filters.topicId && article.topicId !== filters.topicId) return false;
        if (filters.subtopicId && article.subtopicId !== filters.subtopicId) return false;
        if (filters.subsubtopicId && article.subsubtopicId !== filters.subsubtopicId) return false;
        return true;
      }),
      completedArticlesByKey,
    );
  }

  return (
    <section className="library-stoic-grid">
      <aside ref={treePanelRef} className={treeOpen ? 'library-tree-panel open' : 'library-tree-panel collapsed'}>
        <button
          className="library-tree-head library-tree-toggle"
          type="button"
          onClick={() => setTreeOpen((current) => !current)}
          aria-expanded={treeOpen}
          aria-controls="library-outline-tree"
        >
          <span className="library-tree-mark"><Library size={17} /></span>
          <div className="library-tree-head-copy">
            <p className="section-label">Library</p>
            <h2>{scopeTitle}</h2>
          </div>
          <ChevronRight size={18} className={treeOpen ? 'library-tree-chevron open' : 'library-tree-chevron'} />
        </button>

        <div
          id="library-outline-tree"
          className={treeOpen ? 'library-tree open' : 'library-tree'}
          aria-label="Markdown curriculum hierarchy"
          hidden={!treeOpen}
        >
          {articleHierarchy.map((subject) => {
            const progress = getSubjectProgress(subject.id, state.completedArticlesByKey || {});
            const isSubjectActive = subject.id === selectedSubject?.id;
            return (
              <div key={subject.id} className="library-tree-subject">
                <button
                  className={isSubjectActive && topicId === 'all' ? 'tree-node level-0 active' : 'tree-node level-0'}
                  onClick={() => selectSubject(subject.id)}
                >
                  <span>{subject.title}</span>
                  <ProgressRing progress={progress} visible={isSubjectActive} />
                </button>
                <div className={isSubjectActive ? 'tree-branch-shell open' : 'tree-branch-shell'}>
                  <div className="tree-branch">
                    <button className={topicId === 'all' ? 'tree-node level-1 active' : 'tree-node level-1'} onClick={() => selectTopic('all')}>
                      <span>All {subject.title}</span>
                      <ProgressRing progress={progress} visible={isSubjectActive} />
                    </button>
                    {subject.topics.map((topic) => {
                      const topicProgress = getTopicProgress(subject.id, topic.id, state.completedArticlesByKey || {});
                      const isTopicActive = topic.id === selectedTopic?.id;
                      return (
                        <div key={topic.id}>
                          <button className={isTopicActive && subtopicId === 'all' ? 'tree-node level-1 active' : 'tree-node level-1'} onClick={() => selectTopic(topic.id)}>
                            <span>{topic.title}</span>
                            <ProgressRing progress={topicProgress} visible={isSubjectActive} />
                          </button>
                          <div className={isTopicActive ? 'tree-branch-shell open' : 'tree-branch-shell'}>
                            <div className="tree-branch">
                              <button className={subtopicId === 'all' ? 'tree-node level-2 active' : 'tree-node level-2'} onClick={() => selectSubtopic('all')}>
                                <span>All {topic.title}</span>
                                <ProgressRing progress={topicProgress} visible={isTopicActive} />
                              </button>
                              {topic.subtopics.map((subtopic) => {
                                const subtopicProgress = getSubtopicProgress(subject.id, topic.id, subtopic.id, state.completedArticlesByKey || {});
                                const isSubtopicActive = subtopic.id === selectedSubtopic?.id;
                                return (
                                  <div key={subtopic.id}>
                                    <button className={isSubtopicActive && subsubtopicId === 'all' ? 'tree-node level-2 active' : 'tree-node level-2'} onClick={() => selectSubtopic(subtopic.id)}>
                                      <span>{subtopic.title}</span>
                                      <ProgressRing progress={subtopicProgress} visible={isTopicActive} />
                                    </button>
                                    <div className={isSubtopicActive && subtopic.subsubtopics.length > 0 ? 'tree-branch-shell open' : 'tree-branch-shell'}>
                                      <div className="tree-branch">
                                        <button className={subsubtopicId === 'all' ? 'tree-node level-3 active' : 'tree-node level-3'} onClick={() => selectSubsubtopic('all')}>
                                          <span>All {subtopic.title}</span>
                                          <ProgressRing progress={subtopicProgress} visible={isSubtopicActive && subtopic.subsubtopics.length > 0} />
                                        </button>
                                        {subtopic.subsubtopics.map((subsubtopic) => {
                                          const subsubtopicProgress = progressForBranch({
                                            subjectId: subject.id,
                                            topicId: topic.id,
                                            subtopicId: subtopic.id,
                                            subsubtopicId: subsubtopic.id,
                                          });
                                          return (
                                            <button key={subsubtopic.id} className={subsubtopic.id === selectedSubsubtopic?.id ? 'tree-node level-3 active' : 'tree-node level-3'} onClick={() => selectSubsubtopic(subsubtopic.id)}>
                                              <span>{subsubtopic.title}</span>
                                              <ProgressRing progress={subsubtopicProgress} visible={isSubtopicActive && subtopic.subsubtopics.length > 0} />
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="library-stoic-main">
        <div className="library-stoic-toolbar">
          <div className="library-stoic-title">
            <div className="article-breadcrumbs library-breadcrumbs">
              {selectedPath.map((part) => (
                <span key={part}>{part}</span>
              ))}
            </div>
            <h2>{scopeTitle}</h2>
            <p>{progressLabel(scopeProgress)} complete · {visibleArticles.length} visible articles</p>
          </div>
          <button className={state.followedTopics?.[selectedSubject?.id] ? 'secondary-button active' : 'secondary-button'} onClick={() => toggleFollowTopic(selectedSubject.id)}>
            {state.followedTopics?.[selectedSubject?.id] ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {state.followedTopics?.[selectedSubject?.id] ? 'Following' : 'Follow subject'}
          </button>
        </div>

        <div className="search-row library-stoic-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, summary, or path" />
        </div>

        <div className="library-stoic-list">
          {!query.trim() && topicId === 'all' && slotsForSubject(selectedSubject?.id).map((slot) => {
            const published = sharedLessons?.[slot.slotId];
            const slotKey = `generated:${slot.slotId}`;
            const completed = Boolean(state.completedArticlesByKey?.[slotKey]?.completed);
            return (
              <button
                key={slot.slotId}
                className={published ? 'library-row' : 'library-row slot-row'}
                onClick={() => openCanonicalItem(slotKey, {
                  subjectIds: [slot.subjectId],
                  topicIds: [slot.subjectId],
                  domain: 'generated',
                })}
              >
                <div className="library-row-copy">
                  <strong>{published?.title || slot.title}</strong>
                  <p>{published?.openingLine || slot.brief}</p>
                  <small>{[slot.subject, slot.topic].filter(Boolean).join(': ')}</small>
                </div>
                <span className="library-row-meta">
                  {published ? (completed ? 'Done' : 'Lesson') : 'Not written yet'}
                </span>
              </button>
            );
          })}
          {standardArticles.map((article) => {
            const completed = Boolean(state.completedArticlesByKey?.[article.key]?.completed);
            const saved = Boolean(state.savedItems?.[article.key]);
            return (
            <button
              key={article.key}
              className={selectedArticle?.key === article.key ? 'library-row active' : 'library-row'}
              onClick={() => openCanonicalItem(article.key, {
                subjectIds: [article.subjectId],
                topicIds: [article.subjectId, article.topicId, article.subtopicId, article.subsubtopicId].filter(Boolean),
                domain: 'article',
              })}
            >
              <div className="library-row-copy">
                <strong>{article.title}</strong>
                <p>{article.summary}</p>
                <small>{articlePathLabel(article)}</small>
              </div>
              <span className="library-row-meta">
                {completed ? 'Done' : saved ? 'Saved' : 'Article'}
              </span>
            </button>
            );
          })}
          {literatureBooks.map((book) => {
            const total = book.chapters.length;
            const completedCount = book.chapters.filter((chapter) => Boolean(completedArticlesByKey?.[chapter.key]?.completed)).length;
            const fullyRead = total > 0 && completedCount === total;
            const expanded = expandAllBooks || expandedBooks.has(book.bookKey);
            return (
              <div key={book.bookKey} className="library-book-group">
                <button
                  className={expanded ? 'library-row book-row expanded' : 'library-row book-row'}
                  aria-expanded={expanded}
                  onClick={() => toggleBook(book.bookKey)}
                >
                  <div className="library-row-copy">
                    <strong>{book.bookTitle}</strong>
                    <p>{completedCount} of {total} {total === 1 ? 'chapter' : 'chapters'} read</p>
                    {book.pathLabel && <small>{book.pathLabel}</small>}
                  </div>
                  <span className="library-row-meta book-row-meta">
                    <ChevronRight size={16} className={expanded ? 'book-row-chevron open' : 'book-row-chevron'} />
                    {fullyRead ? 'Done' : `${total} ch`}
                  </span>
                </button>
                {expanded && (
                  <div className="library-chapter-list" aria-label={`${book.bookTitle} chapters`}>
                    {book.chapters.map((chapter) => {
                      const completed = Boolean(completedArticlesByKey?.[chapter.key]?.completed);
                      const saved = Boolean(state.savedItems?.[chapter.key]);
                      return (
                        <button
                          key={chapter.key}
                          className={selectedArticle?.key === chapter.key ? 'library-row chapter-subrow active' : 'library-row chapter-subrow'}
                          onClick={() => openCanonicalItem(chapter.key, {
                            subjectIds: [chapter.subjectId],
                            topicIds: [chapter.subjectId, chapter.topicId, chapter.subtopicId, chapter.subsubtopicId].filter(Boolean),
                            domain: 'article',
                          })}
                        >
                          <div className="library-row-copy">
                            <strong>{literatureChapterLabel(chapter, book.bookRawTitle)}</strong>
                          </div>
                          <span className="library-row-meta">
                            {completed ? 'Done' : saved ? 'Saved' : 'Reader'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {visibleArticles.length === 0 && (
          <div className="empty-state">
            <h3>No articles found</h3>
            <p>Try a broader branch or a shorter search phrase.</p>
          </div>
        )}
      </div>
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
            const openNovel = () => openCanonicalItem(itemKey, {
                subjectIds: ['novels'],
                topicIds: ['novels'],
                domain: 'novels',
              });
            return (
              <article
                key={lesson.id}
                className={selectedLesson.id === lesson.id ? 'library-row active' : 'library-row'}
                role="button"
                tabIndex={0}
                onClick={openNovel}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openNovel();
                  }
                }}
              >
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
              </article>
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

function InterestNodeList({ nodes, followedTopics, toggleFollowTopic, depth = 0 }) {
  return (
    <div className={`interest-node-list depth-${depth}`}>
      {nodes.map((node) => {
        const checked = Boolean(followedTopics?.[node.id]);
        const selectedChildren = countSelectedInterestNodes(node.children || [], followedTopics);
        return (
          <div key={node.id} className="interest-node-group">
            <label className={checked ? 'interest-node-row checked' : 'interest-node-row'}>
              <span className="interest-node-main">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFollowTopic(node.id)}
                />
                <span className="interest-node-copy">
                  <strong>{node.title}</strong>
                  <small>
                    {node.articleCount} {node.articleCount === 1 ? 'article' : 'articles'}
                    {selectedChildren > 0 ? ` · ${selectedChildren} selected below` : ''}
                  </small>
                </span>
              </span>
            </label>
            {node.children?.length > 0 && (
              <InterestNodeList
                nodes={node.children}
                followedTopics={followedTopics}
                toggleFollowTopic={toggleFollowTopic}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// A plain-language, step-by-step walkthrough for non-technical readers: what an
// API key is, and exactly how to get one from OpenAI and paste it in.
function ApiKeyGuide({ id }) {
  return (
    <div id={id} className="api-key-guide" role="region" aria-label="How to get an OpenAI API key">
      <div className="api-key-guide-intro">
        <h3>What is an API key, in plain words?</h3>
        <p>
          The lessons in this app can be written and tutored by OpenAI&apos;s AI (the same
          company behind ChatGPT). To do that, the app needs permission to use your OpenAI
          account. An <strong>API key</strong> is just that permission: a long secret password —
          it looks like <code>sk-proj-…</code> — that you paste in once. The app sends your
          requests straight to OpenAI using it. Think of it like a key card for a door: it
          unlocks the service, it&apos;s tied to you, and you can cancel it any time.
        </p>
        <p className="api-key-guide-note">
          You pay OpenAI directly for what you use (usually a few cents). This app never sees
          your card, and your key stays only in this browser.
        </p>
      </div>

      <ol className="api-key-steps">
        <li>
          <span className="api-step-num">1</span>
          <div className="api-step-body">
            <strong>Create a free OpenAI account.</strong>
            <p>Go to the OpenAI platform and sign up (or log in if you already have one).</p>
            <a className="api-step-link" href="https://platform.openai.com/signup" target="_blank" rel="noreferrer">
              Open platform.openai.com <ChevronRight size={14} />
            </a>
          </div>
        </li>

        <li>
          <span className="api-step-num">2</span>
          <div className="api-step-body">
            <strong>Add a little credit (billing).</strong>
            <p>
              API usage is pay-as-you-go and separate from any ChatGPT subscription, so you need
              a payment method. Add a small amount — $5 goes a very long way for reading lessons.
            </p>
            <a className="api-step-link" href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer">
              Open the billing page <ChevronRight size={14} />
            </a>
          </div>
        </li>

        <li>
          <span className="api-step-num">3</span>
          <div className="api-step-body">
            <strong>Go to the API keys page.</strong>
            <p>This is where your secret keys live. It&apos;s under your profile menu, &ldquo;API keys&rdquo;.</p>
            <a className="api-step-link" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
              Open the API keys page <ChevronRight size={14} />
            </a>
          </div>
        </li>

        <li>
          <span className="api-step-num">4</span>
          <div className="api-step-body">
            <strong>Click &ldquo;Create new secret key&rdquo;.</strong>
            <p>Give it any name you like (for example &ldquo;Curiosity app&rdquo;) and confirm.</p>
            <div className="api-step-visual" aria-hidden="true">
              <span className="api-mock-button">+ Create new secret key</span>
            </div>
          </div>
        </li>

        <li>
          <span className="api-step-num">5</span>
          <div className="api-step-body">
            <strong>Copy the key right away.</strong>
            <p>
              OpenAI shows the full key <em>only once</em>. Press <strong>Copy</strong>. If you
              lose it, no harm done — just delete it and make a new one.
            </p>
            <div className="api-step-visual" aria-hidden="true">
              <span className="api-mock-key">sk-proj-a1b2c3••••••••••••••••</span>
              <span className="api-mock-copy">Copy</span>
            </div>
          </div>
        </li>

        <li>
          <span className="api-step-num">6</span>
          <div className="api-step-body">
            <strong>Paste it in the box below and save.</strong>
            <p>
              Paste the key into the field just under this guide, then press
              <strong> Check and save key</strong>. The app makes one tiny test call to confirm
              it works before storing it. That&apos;s it — you&apos;re ready to read and generate.
            </p>
          </div>
        </li>
      </ol>

      <p className="api-key-guide-footer">
        Keep your key private — anyone who has it can spend on your account. You can revoke a key
        any time on the <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">API keys page</a>,
        and it stops working instantly.
      </p>
    </div>
  );
}

function AccountView({ state, syncStatus, isSyncing, toggleFollowTopic, saveProfileUsername }) {
  const [syncNotice, setSyncNotice] = useState('');
  const [isSyncSubmitting, setIsSyncSubmitting] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(state.settings?.profile?.username || '');
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [settings, setSettings] = useState(() => loadAiSettings());
  const [draftKey, setDraftKey] = useState(() => loadAiSettings().apiKey);
  const [aiNotice, setAiNotice] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [showKeyHelp, setShowKeyHelp] = useState(false);
  const [useCustomModel, setUseCustomModel] = useState(() => !AI_MODEL_OPTIONS.some((option) => option.id === settings.model));
  const selectedModelOption = AI_MODEL_OPTIONS.find((option) => option.id === settings.model);
  const modelSelectValue = !useCustomModel && selectedModelOption ? selectedModelOption.id : 'custom';
  const [openInterestSubjects, setOpenInterestSubjects] = useState(() => Object.fromEntries(
    interestSubjectHierarchy.map((subject) => [subject.id, false]),
  ));
  const followedTopics = state.followedTopics || {};

  useEffect(() => {
    setUsernameDraft(state.settings?.profile?.username || '');
  }, [state.settings?.profile?.username]);

  useEffect(() => {
    const latest = loadAiSettings();
    setSettings(latest);
    setDraftKey(latest.apiKey);
  }, []);

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

  async function saveBrowserKey() {
    const cleanKey = draftKey.trim();
    if (!cleanKey || isSavingKey) return;
    setIsSavingKey(true);
    setAiNotice('');
    try {
      await validateApiKey(cleanKey);
      saveApiKey(cleanKey, settings.persistKey);
      setSettings({ ...settings, apiKey: cleanKey, hasStoredKey: true });
      setAiNotice(settings.persistKey ? 'Key checked with OpenAI and saved on this device.' : 'Key checked with OpenAI and saved for this session.');
    } catch (error) {
      setAiNotice(error.message);
    } finally {
      setIsSavingKey(false);
    }
  }

  function removeBrowserKey() {
    clearApiKey();
    setDraftKey('');
    setSettings({ ...settings, apiKey: '', hasStoredKey: false });
    setAiNotice('API key cleared.');
  }

  async function changePassword() {
    const cleanPassword = passwordDraft.trim();
    if (!cleanPassword || isChangingPassword) return;
    setIsChangingPassword(true);
    setPasswordNotice('');
    try {
      await updateSupabasePassword(cleanPassword);
      setPasswordDraft('');
      setPasswordNotice('Password changed. Use it the next time you sign in.');
    } catch (error) {
      setPasswordNotice(error.message);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function signOutCloudSync() {
    if (isSyncSubmitting) return;
    setIsSyncSubmitting(true);
    setSyncNotice('');
    try {
      await signOutSupabase();
      setSyncNotice('Signed out on this device.');
    } catch (error) {
      setSyncNotice(error.message);
    } finally {
      setIsSyncSubmitting(false);
    }
  }

  const cloudConfigured = Boolean(syncStatus.configured || syncStatus.mode === 'supabase');
  const cloudReady = syncStatus.mode === 'supabase' && syncStatus.available;

  return (
    <section className="account-grid">
      <div className="account-stack">
        <article className="account-card">
          <div className="panel-head">
            <div>
              <p className="section-label">Profile</p>
              <h2>Username</h2>
            </div>
            <span className="session-chip">{state.settings?.profile?.username ? 'Synced' : 'Not set'}</span>
          </div>

          <div className="ai-field">
            <label htmlFor="account-username">What should Curiosity call you?</label>
            <input
              id="account-username"
              value={usernameDraft}
              onChange={(event) => setUsernameDraft(event.target.value)}
              placeholder="Add a username"
              autoComplete="nickname"
            />
            <div className="ai-settings-actions">
              <button
                className="secondary-button"
                onClick={() => saveProfileUsername(usernameDraft)}
                disabled={usernameDraft.trim() === (state.settings?.profile?.username || '')}
              >
                Save username
              </button>
            </div>
            <p className="field-help">Your username is part of your synced profile, so it follows your signed-in devices.</p>
          </div>
        </article>

        <article className="account-card">
          <div className="panel-head">
            <div>
              <p className="section-label">Password</p>
              <h2>Change your password</h2>
            </div>
          </div>

          <div className="ai-field">
            <label htmlFor="account-new-password">New password</label>
            <input
              id="account-new-password"
              type="password"
              value={passwordDraft}
              onChange={(event) => setPasswordDraft(event.target.value)}
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
            <div className="ai-settings-actions">
              <button
                className="secondary-button"
                onClick={changePassword}
                disabled={!passwordDraft.trim() || isChangingPassword || !syncStatus.authenticated}
              >
                {isChangingPassword ? 'Saving...' : 'Change password'}
              </button>
            </div>
            {passwordNotice && <p className="settings-notice">{passwordNotice}</p>}
          </div>
        </article>

        <article className="account-card">
          <div className="panel-head">
            <div>
              <p className="section-label">Sign out</p>
              <h2>Account session</h2>
            </div>
            <span className="session-chip">{syncStatus.authenticated ? 'Signed in' : 'Local only'}</span>
          </div>

          <p className="field-help">
            Signing out disconnects this device from your Supabase sync account. Local data on this device stays here unless you reset it.
          </p>
          <div className="ai-settings-actions">
            <button className="warning-button" onClick={signOutCloudSync} disabled={!syncStatus.authenticated || isSyncSubmitting}>
              {isSyncSubmitting ? 'Signing out...' : 'Sign out of this device'}
            </button>
          </div>
        </article>

        <article className="account-card">
          <div className="panel-head">
            <div>
              <p className="section-label">Interests</p>
              <h2>Choose what the Feed should learn from first</h2>
            </div>
            <span className="session-chip">
              {Object.keys(followedTopics).length} selected
            </span>
          </div>

          <p className="field-help">
            Pick the branches you care about and the Feed will start with those, keep some random exploration, and still surface a smaller share from areas you have not opened yet. Emergency Medicine &amp; Critical Care stays manual for now.
          </p>

          <div className="interest-subject-list">
            {interestSubjectHierarchy.map((subject) => {
              const open = Boolean(openInterestSubjects[subject.id]);
              const selectedCount = countSelectedInterestNodes(subject.topics, followedTopics);
              return (
                <section key={subject.id} className={open ? 'interest-subject open' : 'interest-subject'}>
                  <button
                    className="interest-subject-toggle"
                    onClick={() => setOpenInterestSubjects((current) => ({
                      ...current,
                      [subject.id]: !current[subject.id],
                    }))}
                  >
                    <div className="interest-subject-copy">
                      <strong>{subject.title}</strong>
                      <small>
                        {selectedCount > 0 ? `${selectedCount} selected` : `${subject.topics.length} sections`}
                      </small>
                    </div>
                    <ChevronRight className={open ? 'interest-subject-chevron open' : 'interest-subject-chevron'} size={16} />
                  </button>

                  <div className={open ? 'interest-subject-body open' : 'interest-subject-body'}>
                    <div className="interest-subject-inner">
                      <InterestNodeList
                        nodes={subject.topics}
                        followedTopics={followedTopics}
                        toggleFollowTopic={toggleFollowTopic}
                      />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </article>

        <article className="account-card">
          <div className="panel-head">
            <div>
              <p className="section-label">Sync</p>
              <h2>Sign in and sync across devices</h2>
            </div>
            <span className="session-chip">{syncStatusLabel(syncStatus, isSyncing)}</span>
          </div>

          <div className={`server-status ${cloudReady ? 'ready' : cloudConfigured ? (syncStatus.authenticated ? 'missing-key' : 'offline') : 'offline'}`}>
            <span>
              {cloudReady
                ? 'Cloud sync is ready'
                : cloudConfigured
                  ? syncStatus.authenticated
                    ? 'Cloud sync needs backend setup'
                    : 'Sign in to enable cloud sync'
                  : 'Cloud sign-in is not configured yet'}
            </span>
            <p>
              {cloudReady
                ? 'This device is connected to your signed-in sync snapshot. Use the same email on another device to pull the same state there.'
                : cloudConfigured
                  ? syncStatus.authenticated
                    ? syncStatus.error || 'You are signed in, but the sync table or policies still need backend setup.'
                    : 'Refresh the app and sign in to attach this device to your cross-device sync account.'
                  : 'The account screen is ready, but cloud sign-in stays disabled until the Supabase browser config is present.'}
            </p>
          </div>

          {!syncStatus.authenticated && (
            <div className="ai-field">
              <label>Account status</label>
              <p className="field-help">Curiosity now signs you in before the app opens. If you are seeing this unsigned state, refresh the app and use the sign-in screen.</p>
            </div>
          )}

          {syncStatus.authenticated && (
            <div className="ai-field">
              <label htmlFor="account-sync-profile">Signed-in sync profile</label>
              <input id="account-sync-profile" value={syncStatus.userEmail || 'Signed in'} readOnly />
              <p className="field-help">This profile syncs your Curiosity snapshot only: notes, progress, saved items, generated drafts, username, and related app state. Use the Sign out section above when you want to disconnect this device.</p>
            </div>
          )}

          {(syncNotice || syncStatus.updatedAt || syncStatus.error) && (
            <p className="settings-notice">
              {syncNotice || (syncStatus.updatedAt ? `Last synced at ${new Date(syncStatus.updatedAt).toLocaleString()}.` : syncStatus.error)}
            </p>
          )}
        </article>

        <article className="account-card">
          <div className="panel-head">
            <div>
              <p className="section-label">Help</p>
              <h2>What is inside Curiosity?</h2>
            </div>
          </div>
          <OverviewContent />
        </article>
      </div>

      <article className="account-card account-ai-card">
        <div className="panel-head">
          <div>
            <p className="section-label">AI</p>
            <h2>API key and model settings</h2>
          </div>
          <span className="session-chip">{settings.hasStoredKey ? 'Key saved' : 'Key needed'}</span>
        </div>

        <div className="ai-field">
          <div className="ai-field-label-row">
            <label htmlFor="account-ai-key">OpenAI API key</label>
            <button
              type="button"
              className="key-help-toggle"
              aria-expanded={showKeyHelp}
              aria-controls="account-ai-key-help"
              onClick={() => setShowKeyHelp((current) => !current)}
            >
              <HelpCircle size={15} />
              {showKeyHelp ? 'Hide guide' : 'New to this? Read the guide'}
            </button>
          </div>
          {showKeyHelp && <ApiKeyGuide id="account-ai-key-help" />}
          <input
            id="account-ai-key"
            type="password"
            value={draftKey}
            onChange={(event) => setDraftKey(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
          <p className="field-help">
            Your key stays on this device and is sent only to OpenAI. It is never synced to your account or stored anywhere else. Anyone with access to this browser profile could read it, so use a key you can revoke.
          </p>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.persistKey}
            onChange={(event) => updateSettings({ ...settings, persistKey: event.target.checked })}
          />
          Remember key on this device
        </label>
        <div className="ai-settings-actions">
          <button className="secondary-button" onClick={saveBrowserKey} disabled={!draftKey.trim() || isSavingKey}>
            {isSavingKey ? 'Checking key...' : 'Check and save key'}
          </button>
          <button className="secondary-button" onClick={removeBrowserKey} disabled={!settings.hasStoredKey}>Clear key</button>
        </div>

        <div className="ai-field">
          <label htmlFor="account-ai-model">Model</label>
          <select id="account-ai-model" value={modelSelectValue} onChange={(event) => updateModelSelection(event.target.value)}>
            {AI_MODEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
            <option value="custom">Custom model</option>
          </select>
          <p className="field-help">{selectedModelOption?.description || 'Use this for a newer or account-specific model ID.'}</p>
        </div>

        {modelSelectValue === 'custom' && (
          <div className="ai-field">
            <label htmlFor="account-ai-custom-model">Custom model ID</label>
            <input id="account-ai-custom-model" value={settings.model} onChange={(event) => updateSettings({ ...settings, model: event.target.value.trim() })} placeholder="gpt-..." />
          </div>
        )}

        {aiNotice && <p className="settings-notice">{aiNotice}</p>}
      </article>
    </section>
  );
}

function ProgressView({ state, stats, startSession }) {
  const pagesTurned = state.settings?.studyStats?.pagesTurned || 0;
  return (
    <section className="progress-grid">
      <div className="progress-hero">
        <p className="section-label">Progress</p>
        <div className="progress-metrics">
          <Metric label="Complete" value={`${stats.completionPercent}%`} />
          <Metric label="Finished" value={stats.completed} />
          <Metric label="Pages turned" value={pagesTurned} />
        </div>
        <button className="primary-button" onClick={() => startSession()}>
          <Play size={16} />
          Continue
        </button>
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
const TUTOR_SUGGESTIONS = [
  { label: 'Quiz me on this', prompt: 'Quiz me on this lesson. Ask one recall or application question at a time, wait for my answer, then tell me how I did.' },
  { label: 'Run a scenario', prompt: 'Give me one realistic judgment scenario based on this lesson, let me decide what to do, then critique my decision honestly.' },
  { label: 'Help me reflect', prompt: 'Ask me one good reflection question about this lesson and help me think it through.' },
];

const AI_BUBBLE_POSITION_KEY = 'curiosity.aiBubblePosition.v1';

function loadBubblePosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(AI_BUBBLE_POSITION_KEY) || 'null');
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
  } catch {
    // fall through to default position
  }
  return null;
}

function clampBubblePosition(position) {
  const size = 50;
  const margin = 8;
  return {
    x: Math.max(margin, Math.min(window.innerWidth - size - margin, position.x)),
    y: Math.max(margin, Math.min(window.innerHeight - size - margin, position.y)),
  };
}

function FloatingAiPanel({ lesson, messages, onSaveMessages, onClearMessages }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadAiSettings());
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [streamingText, setStreamingText] = useState(null);
  const [notice, setNotice] = useState('');
  const [bubblePosition, setBubblePosition] = useState(() => loadBubblePosition());
  const drag = useRef({ active: false, moved: false, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    if (!open) return;
    const latest = loadAiSettings();
    setSettings(latest);
    setNotice('');
  }, [open]);

  function handleBubblePointerDown(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleBubblePointerMove(event) {
    if (!drag.current.active) return;
    if (!drag.current.moved) {
      const distance = Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY);
      if (distance < 6) return;
      drag.current.moved = true;
    }
    setBubblePosition(clampBubblePosition({
      x: event.clientX - drag.current.offsetX,
      y: event.clientY - drag.current.offsetY,
    }));
  }

  function handleBubblePointerUp(event) {
    if (!drag.current.active) return;
    const wasDragged = drag.current.moved;
    drag.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (wasDragged && bubblePosition) {
      try {
        localStorage.setItem(AI_BUBBLE_POSITION_KEY, JSON.stringify(bubblePosition));
      } catch {
        // position just stays for this session
      }
    } else {
      setOpen(true);
    }
  }

  async function askQuestion(promptText) {
    const cleanQuestion = (promptText ?? question).trim();
    if (!cleanQuestion || isAsking) return;
    if (!settings.apiKey) {
      setNotice('Open Account and save your OpenAI API key before using the tutor.');
      return;
    }

    const userMessage = {
      id: `ai-user-${crypto.randomUUID()}`,
      role: 'user',
      content: cleanQuestion,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    onSaveMessages(nextMessages);
    setQuestion('');
    setIsAsking(true);
    setStreamingText(null);
    setNotice('');

    try {
      const answer = await askOpenAI({
        apiKey: settings.apiKey,
        endpoint: DEFAULT_AI_SETTINGS.endpoint,
        model: settings.model,
        messages,
        question: cleanQuestion,
        lesson,
        includeLessonContext: true,
        onDelta: (delta) => setStreamingText((prev) => (prev || '') + delta),
      });
      onSaveMessages([
        ...nextMessages,
        {
          id: `ai-assistant-${crypto.randomUUID()}`,
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      onSaveMessages([
        ...nextMessages,
        {
          id: `ai-error-${crypto.randomUUID()}`,
          role: 'assistant',
          content: `I could not get an answer: ${error.message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setStreamingText(null);
      setIsAsking(false);
    }
  }

  const bubbleStyle = bubblePosition
    ? { left: bubblePosition.x, top: bubblePosition.y, right: 'auto', bottom: 'auto' }
    : undefined;

  return (
    <>
      <button
        className="ai-float-button"
        style={bubbleStyle}
        onPointerDown={handleBubblePointerDown}
        onPointerMove={handleBubblePointerMove}
        onPointerUp={handleBubblePointerUp}
        aria-label="Open tutor"
      >
        <MessageCircle size={21} />
      </button>
      {open && <button className="ai-scrim" onClick={() => setOpen(false)} aria-label="Close tutor" />}
      <aside className={open ? 'floating-ai open' : 'floating-ai'} aria-hidden={!open}>
        <div className="floating-ai-head">
          <div>
            <span>Tutor</span>
            <strong>{lesson?.title || 'Current lesson'}</strong>
          </div>
          <div className="ai-head-actions">
            <button
              className="icon-button light"
              onClick={() => {
                onClearMessages();
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

        <div className="ai-message-list" aria-live="polite">
          {messages.length === 0 && (
            <div className="ai-empty">
              <p>Ask anything about what you are reading, or try one of these.</p>
            </div>
          )}
          {messages.map((message) => (
            <article key={message.id} className={message.role === 'user' ? 'ai-message user' : 'ai-message assistant'}>
              <span>{message.role === 'user' ? 'You' : 'Tutor'}</span>
              <p>{message.content}</p>
            </article>
          ))}
          {streamingText !== null && (
            <article className="ai-message assistant">
              <span>Tutor</span>
              <p>{streamingText}</p>
            </article>
          )}
          {isAsking && streamingText === null && <p className="ai-thinking">Thinking...</p>}
        </div>

        {messages.length === 0 && (
          <div className="ai-suggestions">
            {TUTOR_SUGGESTIONS.map((suggestion) => (
              <button key={suggestion.label} className="ai-suggestion-chip" onClick={() => askQuestion(suggestion.prompt)} disabled={isAsking}>
                {suggestion.label}
              </button>
            ))}
          </div>
        )}

        {notice && <p className="settings-notice">{notice}</p>}

        <div className="ai-composer">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about this lesson..."
          />
          <button className="primary-button" onClick={() => askQuestion()} disabled={isAsking || !question.trim()}>
            <Send size={16} />
            Ask
          </button>
        </div>
      </aside>
    </>
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
