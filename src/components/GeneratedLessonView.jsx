import { useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
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

function stageState(stageId, currentStage, phase) {
  if (phase === 'idle') return 'pending';
  const order = ALL_STAGES.map((stage) => stage.id);
  const currentIndex = order.indexOf(currentStage);
  const stageIndex = order.indexOf(stageId);
  if (stageIndex < currentIndex) return 'done';
  if (stageIndex === currentIndex) return 'active';
  return 'pending';
}

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

  if (!slot) {
    return (
      <section className="reader-view">
        <p className="empty-copy">This lesson slot no longer exists.</p>
      </section>
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
  const running = phase !== 'idle';

  async function generate() {
    if (running) return;
    const settings = loadAiSettings();
    if (!settings.apiKey) {
      setError('Open Account and save your OpenAI API key first. Generating uses your key.');
      return;
    }

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
      setPhase('idle');
      setStage(null);
    }
  }

  return (
    <section className="reader-view">
      <div className="slot-panel">
        <p className="book-kicker">{[slot.subject, slot.topic].filter(Boolean).join(' · ')}</p>
        <h1>{slot.title}</h1>
        <p className="slot-brief">{slot.brief}</p>

        {!running && (
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
        )}

        {running && (
          <ul className="slot-stages">
            {ALL_STAGES.map((pipelineStage) => {
              const status = stageState(pipelineStage.id, stage, phase);
              return (
                <li key={pipelineStage.id} className={`slot-stage ${status}`}>
                  {status === 'done' ? <Check size={14} /> : status === 'active' ? <Loader2 size={14} className="spin" /> : <span className="slot-stage-dot" />}
                  {pipelineStage.label}
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="error-text">{error}</p>}

        {!running && (
          <button className="primary-button" onClick={generate}>
            <Sparkles size={16} />
            {hasCheckpoint ? 'Resume writing this lesson' : 'Write this lesson for the library'}
          </button>
        )}
      </div>
    </section>
  );
}
