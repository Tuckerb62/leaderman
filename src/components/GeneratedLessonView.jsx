import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Check, Loader2, Sparkles } from 'lucide-react';
import { BookReader } from './BookReader.jsx';
import { loadAiSettings } from '../data/aiSettings.js';
import {
  CANON_MODEL,
  PIPELINE_STEPS,
  clearPipelineCheckpoint,
  loadPipelineCheckpoint,
  runLessonPipeline,
} from '../logic/lessonPipeline.js';
import { publishGeneratedLesson } from '../logic/generatedLessons.js';

const ALL_STAGES = [...PIPELINE_STEPS, { id: 'publish', label: 'Publishing to the shared library' }];

function stageStatus(stageId, currentStage, phase) {
  if (phase === 'idle') return 'pending';
  const order = ALL_STAGES.map((s) => s.id);
  const currentIndex = order.indexOf(currentStage);
  const stageIndex = order.indexOf(stageId);
  if (stageIndex < currentIndex) return 'done';
  if (stageIndex === currentIndex) return 'active';
  return 'pending';
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function PipelineScreen({ slot, stage, phase, elapsed, error, onResume }) {
  return (
    <div className={`pipeline-screen${phase === 'error' ? ' pipeline-screen--error' : ''}`}>
      <div className="pipeline-screen-inner">
        <p className="pipeline-screen-kicker">{[slot.subject, slot.topic].filter(Boolean).join(' · ')}</p>
        <h2 className="pipeline-screen-title">{slot.title}</h2>

        <ul className="pipeline-stage-list">
          {ALL_STAGES.map((s) => {
            const status = stageStatus(s.id, stage, phase);
            return (
              <li key={s.id} className={`pipeline-stage pipeline-stage--${status}`}>
                <span className="pipeline-stage-icon">
                  {status === 'done' ? (
                    <Check size={15} />
                  ) : status === 'active' ? (
                    phase === 'error' ? <AlertCircle size={15} /> : <Loader2 size={15} className="spin" />
                  ) : (
                    <span className="pipeline-stage-dot" />
                  )}
                </span>
                <span className="pipeline-stage-label">{s.label}</span>
              </li>
            );
          })}
        </ul>

        <p className="pipeline-timer">{formatElapsed(elapsed)}</p>

        {phase === 'error' ? (
          <div className="pipeline-error">
            <p className="pipeline-error-msg">{error}</p>
            <button className="primary-button" onClick={onResume}>Resume</button>
          </div>
        ) : (
          <p className="pipeline-tagline">Written once, for everyone. Your key pays for this run.</p>
        )}
      </div>
    </div>
  );
}

// Dev convenience: append ?mock-pipeline to the URL to preview the loading screen
// without signing in. Set mock-pipeline=error to preview the error state.
const DEV_MOCK_PARAM = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock-pipeline');

export function GeneratedLessonView({
  slot,
  lesson,
  completed,
  onComplete,
  position,
  onPosition,
  readerSettings,
  onReaderSettings,
  onPublished,
}) {
  const [phase, setPhase] = useState('idle');
  const [stage, setStage] = useState(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(null);

  // Tick elapsed seconds while the pipeline is actively running.
  useEffect(() => {
    if (phase !== 'running' && phase !== 'publishing') return;
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  if (!slot) {
    return (
      <section className="reader-view">
        <p className="empty-copy">This lesson slot no longer exists.</p>
      </section>
    );
  }

  // Dev mock: show the loading screen with fake state for visual testing.
  if (DEV_MOCK_PARAM) {
    const mockPhase = DEV_MOCK_PARAM === 'error' ? 'error' : 'running';
    const mockError = mockPhase === 'error' ? 'Could not reach OpenAI. Check your network and try again; the run will resume from this step.' : '';
    return (
      <PipelineScreen
        slot={slot.slotId ? slot : { subject: 'Philosophy', topic: 'Ethics', title: slot.title || 'The Trolley Problem', slotId: 'mock' }}
        stage="verify"
        phase={mockPhase}
        elapsed={47}
        error={mockError}
        onResume={() => {}}
      />
    );
  }

  if (lesson) {
    return (
      <section className="reader-view">
        <BookReader
          bookKey={`generated:${slot.slotId}`}
          kicker={[slot.subject, slot.topic].filter(Boolean).join(' · ')}
          title={lesson.title}
          pages={lesson.pages}
          position={position}
          onPosition={onPosition}
          completed={completed}
          onComplete={onComplete}
          readerSettings={readerSettings}
          onReaderSettings={onReaderSettings}
          footer={`Written for the shared library with ${lesson.model || 'AI'}, checked against web sources before publishing.`}
        />
      </section>
    );
  }

  const hasCheckpoint = Boolean(loadPipelineCheckpoint(slot.slotId));
  const isRunning = phase === 'running' || phase === 'publishing';

  async function generate() {
    if (isRunning) return;
    const settings = loadAiSettings();
    if (!settings.apiKey) {
      setError('Open Account and save your OpenAI API key first. Generating uses your key.');
      return;
    }

    startTimeRef.current = Date.now();
    setElapsed(0);
    setPhase('running');
    setError('');
    try {
      const result = await runLessonPipeline({
        apiKey: settings.apiKey,
        slot,
        onProgress: (nextStage) => setStage(nextStage),
      });
      setPhase('publishing');
      setStage('publish');
      const published = await publishGeneratedLesson({
        slotId: slot.slotId,
        lesson: result.lesson,
        model: result.model,
        verificationNotes: result.verificationNotes,
      });
      clearPipelineCheckpoint(slot.slotId);
      onPublished(slot.slotId, published.lesson);
    } catch (nextError) {
      setError(nextError.message);
      setPhase('error');
    }
  }

  if (phase !== 'idle') {
    return (
      <PipelineScreen
        slot={slot}
        stage={stage}
        phase={phase}
        elapsed={elapsed}
        error={error}
        onResume={generate}
      />
    );
  }

  return (
    <section className="reader-view">
      <div className="slot-panel">
        <p className="book-kicker">{[slot.subject, slot.topic].filter(Boolean).join(' · ')}</p>
        <h1>{slot.title}</h1>
        <p className="slot-brief">{slot.brief}</p>

        <div className="slot-explainer">
          <p>
            This lesson has not been written yet. Opening it runs a multi-step writing and fact-checking
            pipeline on your OpenAI key — the most expensive single action in the app — and the finished
            lesson is published to the shared library for every reader, credited to no one, owned by everyone.
          </p>
          <p>
            The pipeline drafts the essay with web search, fact-checks every claim against sources, corrects
            or removes what it cannot verify, then makes a final editing pass. It writes with
            {` ${CANON_MODEL} `}regardless of your chat model setting. Generation takes a few minutes; keep
            this screen open.
          </p>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-button" onClick={generate}>
          <Sparkles size={16} />
          {hasCheckpoint ? 'Resume writing this lesson' : 'Write this lesson for the library'}
        </button>
      </div>
    </section>
  );
}
