import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  Brain,
  ChevronRight,
  Download,
  FileUp,
  Library,
  LineChart,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Target,
  Trash2,
} from 'lucide-react';
import { createInitialState, domains } from './data/seedData.js';
import { exportState, loadState, parseImportedState, saveState } from './data/storage.js';
import { nextReviewState, todayKey } from './logic/reviewScheduler.js';
import { dueLessons, progressStats, recommendedLessons, sourceById, weakDomains } from './logic/selectors.js';

const navItems = [
  { id: 'today', label: 'Today', icon: Target },
  { id: 'learn', label: 'Learn', icon: Brain },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'review', label: 'Review', icon: RotateCcw },
  { id: 'progress', label: 'Progress', icon: LineChart },
];

const ratingCopy = {
  know: 'Know it',
  later: 'Review later',
  work: 'Needs work',
};

export default function App() {
  const [state, setState] = useState(() => loadState());
  const [view, setView] = useState('today');
  const [selectedLessonId, setSelectedLessonId] = useState(() => recommendedLessons(loadState(), 1)[0]?.id);
  const [session, setSession] = useState(null);

  useEffect(() => saveState(state), [state]);

  const stats = useMemo(() => progressStats(state), [state]);
  const due = useMemo(() => dueLessons(state), [state]);
  const selectedLesson = state.lessons.find((lesson) => lesson.id === selectedLessonId) || state.lessons[0];

  function updateReview(lessonId, rating) {
    const lesson = state.lessons.find((item) => item.id === lessonId);
    setState((current) => ({
      ...current,
      reviews: {
        ...current.reviews,
        [lessonId]: nextReviewState(current.reviews[lessonId], rating),
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
              ...current.reflections,
            ].slice(0, 80)
          : current.reflections,
    }));
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
      const finished = {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: new Date().toISOString(),
        lessonIds: session.lessonIds,
        results: nextResults,
        minutes: session.lessonIds.length * 6,
      };
      setState((current) => ({
        ...current,
        sessions: [finished, ...current.sessions].slice(0, 120),
      }));
      setSession(null);
      setView('progress');
      return;
    }
    setSession({ ...session, currentIndex: nextIndex, results: nextResults });
    setSelectedLessonId(session.lessonIds[nextIndex]);
  }

  function saveReflection(lessonId, text) {
    if (!text.trim()) return;
    setState((current) => ({
      ...current,
      reflections: [
        {
          id: `reflection-${crypto.randomUUID()}`,
          lessonId,
          text: text.trim(),
          createdAt: new Date().toISOString(),
        },
        ...current.reflections,
      ].slice(0, 100),
    }));
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

  async function importBackup(file) {
    if (!file) return;
    const text = await file.text();
    setState(parseImportedState(text));
  }

  const commonProps = {
    state,
    selectedLesson,
    setSelectedLessonId,
    startSession,
    updateReview,
    rateCurrentLesson,
    saveReflection,
    saveLessonNote,
    session,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <p>Leaderman</p>
            <span>Leadership Formation</span>
          </div>
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

        <div className="sidebar-card">
          <span className="eyebrow">Local only</span>
          <p>No account, no cloud, no AI calls. Your notes stay in this browser.</p>
          <div className="backup-row">
            <button className="icon-button" onClick={() => exportState(state)} title="Export backup">
              <Download size={16} />
            </button>
            <label className="icon-button" title="Import backup">
              <FileUp size={16} />
              <input type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
            </label>
            <button className="icon-button" onClick={() => setState(createInitialState())} title="Reset local data">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <p className="date-line">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="top-actions">
            <Metric label="Due" value={stats.due} />
            <Metric label="Mastery" value={`${stats.mastery}%`} />
            <button className="primary-button" onClick={() => startSession()}>
              <Play size={16} />
              Start session
            </button>
          </div>
        </header>

        {view === 'today' && <TodayView {...commonProps} stats={stats} due={due} />}
        {view === 'learn' && <LearnView {...commonProps} />}
        {view === 'library' && <LibraryView {...commonProps} />}
        {view === 'review' && <ReviewView {...commonProps} due={due} />}
        {view === 'progress' && <ProgressView {...commonProps} stats={stats} />}
      </main>
    </div>
  );
}

function viewTitle(view) {
  return {
    today: 'Tonight’s briefing',
    learn: 'Training session',
    library: 'Knowledge library',
    review: 'Review queue',
    progress: 'Progress signal',
  }[view];
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TodayView({ state, stats, due, startSession, setSelectedLessonId, saveReflection }) {
  const featured = recommendedLessons(state, 3);
  const [quickNote, setQuickNote] = useState('');

  return (
    <section className="today-grid">
      <div className="focus-panel">
        <div className="panel-head">
          <div>
            <p className="section-label">Tonight’s focus</p>
            <h2>{state.settings.currentFocus}</h2>
          </div>
          <ShieldCheck className="panel-icon" size={28} />
        </div>
        <p className="focus-copy">
          Train decision quality, power literacy, and ethical influence with short lessons, scenarios, and recall reps.
        </p>
        <div className="stat-row">
          <Metric label="Due reviews" value={due.length} />
          <Metric label="Lessons touched" value={stats.completed} />
          <Metric label="Minutes" value={stats.minutes} />
        </div>
        <button className="primary-button wide" onClick={() => startSession(featured.map((lesson) => lesson.id))}>
          <Play size={16} />
          Run 3-card briefing
        </button>
      </div>

      <div className="quick-panel">
        <p className="section-label">Reflection capture</p>
        <textarea
          value={quickNote}
          onChange={(event) => setQuickNote(event.target.value)}
          placeholder="Capture a leadership observation, decision, or situation from today..."
        />
        <button
          className="secondary-button"
          onClick={() => {
            saveReflection(featured[0]?.id || state.lessons[0].id, quickNote);
            setQuickNote('');
          }}
        >
          Save reflection
        </button>
      </div>

      <div className="lesson-strip">
        {featured.map((lesson) => (
          <LessonPreview key={lesson.id} lesson={lesson} review={state.reviews[lesson.id]} onOpen={() => setSelectedLessonId(lesson.id)} />
        ))}
      </div>
    </section>
  );
}

function LearnView({ state, selectedLesson, session, setSelectedLessonId, rateCurrentLesson, updateReview, saveReflection, saveLessonNote }) {
  const [step, setStep] = useState('article');
  const [reflection, setReflection] = useState('');
  const sources = selectedLesson.sourceIds.map((id) => sourceById(state, id)).filter(Boolean);
  const sessionProgress = session ? `${session.currentIndex + 1} / ${session.lessonIds.length}` : 'Solo lesson';

  return (
    <section className="learn-grid">
      <div className="lesson-panel">
        <div className="lesson-header">
          <div>
            <p className="section-label">{selectedLesson.domain} · {selectedLesson.minutes} min · {selectedLesson.difficulty}</p>
            <h2>{selectedLesson.title}</h2>
          </div>
          <span className="session-chip">{sessionProgress}</span>
        </div>

        <div className="step-tabs">
          {['article', 'scenario', 'decision', 'reflection'].map((item) => (
            <button key={item} className={step === item ? 'active' : ''} onClick={() => setStep(item)}>
              {item}
            </button>
          ))}
        </div>

        {step === 'article' && (
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

        {step === 'scenario' && (
          <div className="lesson-section">
            <h3>Scenario</h3>
            <p>{selectedLesson.scenario}</p>
            <InfoBlock title="Practice rep" text={selectedLesson.practiceRep} />
          </div>
        )}

        {step === 'decision' && (
          <div className="lesson-section">
            <h3>Decision options</h3>
            <div className="option-list">
              {selectedLesson.decisionOptions.map((option) => (
                <button key={option} className={option === selectedLesson.preferredOption ? 'option-card preferred' : 'option-card'}>
                  {option}
                  {option === selectedLesson.preferredOption && <span>best first move</span>}
                </button>
              ))}
            </div>
            <InfoBlock title="Review card" text={selectedLesson.reviewPrompt} />
          </div>
        )}

        {step === 'reflection' && (
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
            {ratingCopy.know}
          </button>
          <button className="secondary-button" onClick={() => (session ? rateCurrentLesson('later') : updateReview(selectedLesson.id, 'later'))}>
            {ratingCopy.later}
          </button>
          <button className="warning-button" onClick={() => (session ? rateCurrentLesson('work') : updateReview(selectedLesson.id, 'work'))}>
            {ratingCopy.work}
          </button>
        </div>
      </div>

      <aside className="right-rail">
        <FidelityPanel lesson={selectedLesson} />
        <div className="source-panel">
          <p className="section-label">Source basis</p>
          {sources.map((source) => (
            <SourceMini key={source.id} source={source} />
          ))}
        </div>
        <NoteBox note={state.notes[selectedLesson.id] || ''} onSave={(note) => saveLessonNote(selectedLesson.id, note)} />
      </aside>

      <div className="queue-panel">
        <p className="section-label">Next lessons</p>
        {recommendedLessons(state, 8).map((lesson) => (
          <button key={lesson.id} className={lesson.id === selectedLesson.id ? 'queue-row active' : 'queue-row'} onClick={() => setSelectedLessonId(lesson.id)}>
            <span>{lesson.title}</span>
            <small>{lesson.domain}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function LibraryView({ state, selectedLesson, setSelectedLessonId }) {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('All');
  const filteredLessons = state.lessons.filter((lesson) => {
    const text = `${lesson.title} ${lesson.domain} ${lesson.coreIdea} ${lesson.tags.join(' ')}`.toLowerCase();
    return (domain === 'All' || lesson.domain === domain) && text.includes(query.toLowerCase());
  });

  return (
    <section className="library-grid">
      <div className="library-main">
        <div className="search-row">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons, concepts, or tags" />
        </div>
        <div className="domain-filter">
          {['All', ...domains].map((item) => (
            <button key={item} className={domain === item ? 'active' : ''} onClick={() => setDomain(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="library-list">
          {filteredLessons.map((lesson) => (
            <button key={lesson.id} className={selectedLesson.id === lesson.id ? 'library-row active' : 'library-row'} onClick={() => setSelectedLessonId(lesson.id)}>
              <div>
                <strong>{lesson.title}</strong>
                <p>{lesson.coreIdea}</p>
              </div>
              <span>{lesson.domain}</span>
            </button>
          ))}
        </div>
      </div>

      <aside className="source-list-panel">
        <p className="section-label">Condensed source cards</p>
        {state.sources.map((source) => (
          <article key={source.id} className="source-card">
            <span>{source.domain}</span>
            <h3>{source.title}</h3>
            <p>{source.usefulIdea}</p>
            <small>{source.author}</small>
          </article>
        ))}
      </aside>
    </section>
  );
}

function ReviewView({ state, due, updateReview, setSelectedLessonId }) {
  return (
    <section className="review-grid">
      <div className="review-stack">
        <div className="panel-head">
          <div>
            <p className="section-label">Due today</p>
            <h2>{due.length ? `${due.length} cards waiting` : 'No reviews due'}</h2>
          </div>
          <Archive className="panel-icon" />
        </div>
        {due.length === 0 && <p className="empty-copy">Your queue is clear. Start a new session from Today to keep building reps.</p>}
        {due.map((lesson) => (
          <article key={lesson.id} className="review-card">
            <button className="review-title" onClick={() => setSelectedLessonId(lesson.id)}>
              <strong>{lesson.title}</strong>
              <ChevronRight size={16} />
            </button>
            <p>{lesson.reviewPrompt}</p>
            <div className="rating-bar compact">
              <button className="success-button" onClick={() => updateReview(lesson.id, 'know')}>Know it</button>
              <button className="secondary-button" onClick={() => updateReview(lesson.id, 'later')}>Review later</button>
              <button className="warning-button" onClick={() => updateReview(lesson.id, 'work')}>Needs work</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProgressView({ state, stats, startSession }) {
  const weak = weakDomains(state);
  return (
    <section className="progress-grid">
      <div className="progress-hero">
        <p className="section-label">Local progress</p>
        <h2>{stats.completed} lessons touched</h2>
        <p>Mastery here means repeated contact with ideas under recall, scenario judgment, and reflection.</p>
        <div className="stat-row">
          <Metric label="Recall wins" value={stats.known} />
          <Metric label="Needs work" value={stats.needsWork} />
          <Metric label="Study minutes" value={stats.minutes} />
        </div>
        <button className="primary-button" onClick={() => startSession()}>
          <Play size={16} />
          Continue training
        </button>
      </div>

      <div className="signal-panel">
        <p className="section-label">Weak domains</p>
        {weak.length === 0 && <p className="empty-copy">No weak domains yet. Mark a few cards to generate a signal.</p>}
        {weak.slice(0, 8).map((item) => (
          <div key={item.domain} className="domain-signal">
            <span>{item.domain}</span>
            <div className="bar"><i style={{ width: `${Math.min(100, 18 + item.needsWork * 18)}%` }} /></div>
            <strong>{item.needsWork}</strong>
          </div>
        ))}
      </div>

      <div className="reflection-panel">
        <p className="section-label">Recent reflections</p>
        {state.reflections.length === 0 && <p className="empty-copy">Your saved reflections will appear here.</p>}
        {state.reflections.slice(0, 8).map((reflection) => {
          const lesson = state.lessons.find((item) => item.id === reflection.lessonId);
          return (
            <article key={reflection.id} className="reflection-row">
              <strong>{lesson?.title || 'General reflection'}</strong>
              <p>{reflection.text}</p>
              <small>{new Date(reflection.createdAt).toLocaleString()}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LessonPreview({ lesson, review, onOpen }) {
  return (
    <button className="lesson-preview" onClick={onOpen}>
      <span>{lesson.domain}</span>
      <strong>{lesson.title}</strong>
      <p>{lesson.coreIdea}</p>
      <small>{review?.status || 'new'} · due {review?.dueAt || todayKey()}</small>
    </button>
  );
}

function FidelityPanel({ lesson }) {
  const rows = [
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
