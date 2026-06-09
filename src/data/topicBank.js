const SUBJECT_DEFINITIONS = [
  {
    id: 'leadership',
    title: 'Leadership',
    description: 'Judgment, self-command, teams, power, conflict, systems, and decision-making.',
    subtopics: ['judgment', 'teams', 'power', 'conflict', 'systems', 'ethics'],
  },
  {
    id: 'philosophy',
    title: 'Philosophy',
    description: 'Serious traditions for thinking about duty, character, truth, and meaning.',
    subtopics: ['stoicism', 'existentialism', 'ethics', 'political-philosophy', 'epistemology'],
  },
  {
    id: 'psychology',
    title: 'Psychology',
    description: 'Attention, bias, behavior, motivation, and social judgment.',
    subtopics: ['cognition', 'behavior', 'motivation', 'bias', 'social-psychology'],
  },
  {
    id: 'history',
    title: 'History',
    description: 'Historical cases, turning points, and institutional shifts.',
    subtopics: ['roman-history', 'revolutions', 'war', 'diplomacy', 'empires', 'political-history'],
  },
  {
    id: 'world-history',
    title: 'World History',
    description: 'Cross-regional historical arcs and state-building patterns.',
    subtopics: ['roman-history', 'japan', 'empires', 'war', 'institutions'],
  },
  {
    id: 'literature',
    title: 'Literature',
    description: 'Classic and modern works used as judgment practice.',
    subtopics: ['character', 'moral-complexity', 'power', 'obsession', 'mercy'],
  },
  {
    id: 'writing',
    title: 'Writing',
    description: 'Clear thinking, explanation, framing, and disciplined communication.',
    subtopics: ['clarity', 'framing', 'example', 'structure'],
  },
  {
    id: 'communication',
    title: 'Communication',
    description: 'Speaking, feedback, negotiation, and framing under pressure.',
    subtopics: ['feedback', 'conversation', 'framing', 'negotiation'],
  },
  {
    id: 'business',
    title: 'Business',
    description: 'Execution, incentives, operations, and leadership inside organizations.',
    subtopics: ['teams', 'operations', 'incentives', 'strategy'],
  },
  {
    id: 'economics',
    title: 'Economics',
    description: 'Incentives, tradeoffs, policy, and market behavior.',
    subtopics: ['macro', 'trade', 'incentives', 'markets', 'policy'],
  },
  {
    id: 'technology',
    title: 'Technology',
    description: 'Software, systems, AI, and technical power with human consequences.',
    subtopics: ['software', 'internet', 'ai-future', 'systems', 'product-thinking'],
  },
  {
    id: 'politics',
    title: 'Politics',
    description: 'Institutions, legitimacy, elections, courts, and political strategy.',
    subtopics: ['us-politics', 'institutions', 'elections', 'courts', 'world-politics'],
  },
  {
    id: 'health',
    title: 'Health',
    description: 'Human performance, endurance, and personal maintenance.',
    subtopics: ['stress', 'recovery', 'habits', 'attention'],
  },
  {
    id: 'emergency-medicine',
    title: 'Emergency Medicine',
    description: 'Acute care, triage, shock, trauma, and emergency reasoning.',
    subtopics: ['triage', 'airway', 'shock', 'trauma', 'tox', 'procedures'],
  },
  {
    id: 'biopharm',
    title: 'Biopharm',
    description: 'Therapeutics, trials, biotech business, and regulation.',
    subtopics: ['trials', 'therapeutics', 'regulation', 'biotech-business', 'drug-development'],
  },
  {
    id: 'science-research',
    title: 'Science / Research',
    description: 'Verification, evidence, mechanism, and scientific judgment.',
    subtopics: ['research-methods', 'verification', 'mechanism', 'evidence'],
  },
];

function normalizedLessonText(lesson) {
  return [
    lesson.title,
    lesson.domain,
    lesson.coreIdea,
    lesson.slug,
    lesson.summaryKind,
    lesson.collectionTitle,
    ...(lesson.tags || []),
    ...(lesson.sourceBasis || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function includesAny(text, fragments) {
  return fragments.some((fragment) => text.includes(fragment));
}

function subjectIdsForLesson(lesson) {
  const text = normalizedLessonText(lesson);
  const ids = new Set();

  if (lesson.domain === 'Philosophy' || includesAny(text, ['stoic', 'epictetus', 'marcus aurelius', 'existential', 'aristotle', 'epicurean', 'confuc', 'dao', 'buddhist'])) {
    ids.add('philosophy');
  }
  if (lesson.domain === 'Communication' || includesAny(text, ['feedback', 'conversation', 'framing', 'communication', 'ask for the example', 'tell the tradeoff'])) {
    ids.add('communication');
    ids.add('writing');
  }
  if (lesson.domain === 'Technology/Future' || includesAny(text, ['ai ', 'artificial intelligence', 'software', 'internet', 'technology', 'verification'])) {
    ids.add('technology');
    ids.add('science-research');
  }
  if (lesson.domain === 'Self-Help' || includesAny(text, ['habit', 'motivation', 'attention', 'bias', 'psychology', 'mindset'])) {
    ids.add('psychology');
    ids.add('health');
  }
  if (lesson.domain === 'Literature') {
    ids.add('literature');
    ids.add('writing');
  }
  if (lesson.domain === 'History') ids.add('history');
  if (lesson.domain === 'World History' || lesson.summaryKind === 'History') {
    ids.add('history');
    ids.add('world-history');
    ids.add('politics');
  }
  if (includesAny(text, ['republic', 'election', 'court', 'empire', 'policy', 'constitutional', 'civil rights', 'watergate', 'lincoln', 'caesar', 'augustus'])) {
    ids.add('politics');
  }
  if (includesAny(text, ['incentive', 'market', 'trade', 'macro', 'economic'])) {
    ids.add('economics');
  }
  if (includesAny(text, ['team', 'power', 'strategy', 'systems', 'leadership', 'conflict', 'judgment', 'ethics', 'self-command', 'influence'])) {
    ids.add('leadership');
    ids.add('business');
  }

  if (ids.size === 0) ids.add('leadership');
  return [...ids];
}

function subtopicsForSubject(lesson, subjectId) {
  const text = normalizedLessonText(lesson);

  switch (subjectId) {
    case 'philosophy':
      return SUBJECT_DEFINITIONS.find((subject) => subject.id === subjectId).subtopics.filter((subtopic) => {
        const rules = {
          stoicism: ['stoic', 'epictetus', 'marcus aurelius', 'meditations'],
          existentialism: ['existential'],
          ethics: ['ethic', 'mercy', 'justice', 'moral'],
          'political-philosophy': ['republic', 'power', 'legitimacy'],
          epistemology: ['truth', 'knowledge', 'verification'],
        };
        return includesAny(text, rules[subtopic] || []);
      });
    case 'history':
    case 'world-history':
      return SUBJECT_DEFINITIONS.find((subject) => subject.id === subjectId).subtopics.filter((subtopic) => {
        const rules = {
          'roman-history': ['roman', 'caesar', 'augustus'],
          revolutions: ['revolution'],
          war: ['war', 'missile crisis', 'apollo 13'],
          diplomacy: ['diplomacy', 'camp david', 'negotiation'],
          empires: ['empire', 'imperial'],
          'political-history': ['republic', 'constitutional', 'civil rights'],
          japan: ['japan', 'meiji', 'sengoku'],
          institutions: ['institutions', 'courts', 'civil service'],
        };
        return includesAny(text, rules[subtopic] || []);
      });
    default:
      return SUBJECT_DEFINITIONS.find((subject) => subject.id === subjectId)?.subtopics.filter((subtopic) => {
        const pretty = subtopic.replace(/-/g, ' ');
        return text.includes(pretty) || text.includes(subtopic);
      }) || [];
  }
}

export function describeLessonTopics(lesson) {
  const subjectIds = subjectIdsForLesson(lesson);
  return subjectIds.map((subjectId) => ({
    subjectId,
    subtopicIds: subtopicsForSubject(lesson, subjectId),
  }));
}

export function buildLibraryLessonIndex(lessons) {
  return lessons
    .filter((lesson) => lesson.summaryKind !== 'Novel')
    .map((lesson) => {
      const topics = describeLessonTopics(lesson);
      return {
        ...lesson,
        topicSubjectIds: topics.map((entry) => entry.subjectId),
        topicSubtopicIds: topics.flatMap((entry) => entry.subtopicIds),
      };
    });
}

export function buildTopicBank(lessons) {
  const indexedLessons = buildLibraryLessonIndex(lessons);

  return SUBJECT_DEFINITIONS.map((subject) => {
    const lessonsForSubject = indexedLessons.filter((lesson) => lesson.topicSubjectIds.includes(subject.id));
    return {
      ...subject,
      lessonCount: lessonsForSubject.length,
      subtopics: subject.subtopics.map((subtopicId) => ({
        id: subtopicId,
        title: subtopicId.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        lessonCount: lessonsForSubject.filter((lesson) => lesson.topicSubtopicIds.includes(subtopicId)).length,
      })),
    };
  });
}

export { SUBJECT_DEFINITIONS };
