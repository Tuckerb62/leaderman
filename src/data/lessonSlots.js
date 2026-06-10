// The curated set of lesson slots the shared library can grow into.
// A slot is a topic the library should eventually cover but has no lesson for
// yet. Opening an empty slot lets any signed-in user generate its lesson with
// their own API key; the published result becomes canon for all users.
// Grow the library by adding entries here.

export const LESSON_SLOTS = [
  {
    slotId: 'emergency-medicine-septic-shock',
    subjectId: 'emergency-medicine-critical-care',
    subject: 'Emergency Medicine & Critical Care',
    topic: 'Shock',
    title: 'Septic Shock: Recognition and the First Hour',
    brief: 'Recognition of septic shock in the emergency department, why early recognition is hard, the reasoning behind early antibiotics and source control, fluid and vasopressor judgment, and common traps. Educational microlearning, not patient-specific advice.',
  },
  {
    slotId: 'emergency-medicine-airway-decision',
    subjectId: 'emergency-medicine-critical-care',
    subject: 'Emergency Medicine & Critical Care',
    topic: 'Airway',
    title: 'The Decision to Intubate',
    brief: 'The judgment call of when to intubate: anatomic vs physiologic threat, trajectory over snapshots, the cost of waiting vs the cost of acting, and how experienced clinicians reason about borderline cases. Educational microlearning, not patient-specific advice.',
  },
  {
    slotId: 'history-bronze-age-collapse',
    subjectId: 'history',
    subject: 'History',
    topic: 'Ancient World',
    title: 'The Bronze Age Collapse',
    brief: 'The late Bronze Age collapse around 1200 BC: the interconnected palace economies of the eastern Mediterranean, the evidence for systems failure, the Sea Peoples debate, what historians actually know vs speculate, and why complex systems fail together.',
  },
  {
    slotId: 'history-thirty-years-war',
    subjectId: 'history',
    subject: 'History',
    topic: 'Early Modern Europe',
    title: 'The Thirty Years War and the Peace of Westphalia',
    brief: 'How a religious conflict became a continental catastrophe, the human cost in the German lands, how exhaustion produced the Westphalian settlement, and why the idea of sovereign states traces to it (and the limits of that story).',
  },
  {
    slotId: 'philosophy-epistemic-humility',
    subjectId: 'philosophy',
    subject: 'Philosophy',
    topic: 'Epistemology',
    title: 'Epistemic Humility: Knowing What You Do Not Know',
    brief: 'The philosophy of calibrated belief: Socratic ignorance, fallibilism, how overconfidence corrupts judgment, the difference between humility and indecision, and practical habits for holding beliefs at the right strength.',
  },
  {
    slotId: 'philosophy-free-will-debate',
    subjectId: 'philosophy',
    subject: 'Philosophy',
    topic: 'Mind',
    title: 'The Free Will Debate in Plain Terms',
    brief: 'Determinism, libertarian free will, and compatibilism explained plainly; what each position concedes; why the debate matters for responsibility and blame; and where the serious disagreements actually live.',
  },
  {
    slotId: 'science-immune-system-tradeoffs',
    subjectId: 'science',
    subject: 'Science',
    topic: 'Biology',
    title: 'The Immune System as a Series of Tradeoffs',
    brief: 'How the immune system balances speed against accuracy and aggression against self-damage: innate vs adaptive immunity, why autoimmunity and allergy are the cost of vigilance, and what fever and inflammation actually buy.',
  },
  {
    slotId: 'science-entropy-plain-terms',
    subjectId: 'science',
    subject: 'Science',
    topic: 'Physics',
    title: 'Entropy Without the Mysticism',
    brief: 'What entropy actually is (counting microstates, not disorder poetry), why the second law follows from probability, what it does and does not imply about time, life, and the universe, and common misuses of the concept.',
  },
  {
    slotId: 'politics-coalition-government',
    subjectId: 'politics',
    subject: 'Politics',
    topic: 'Institutions',
    title: 'How Coalition Governments Actually Work',
    brief: 'Coalition formation in parliamentary systems: why parties enter coalitions, portfolio allocation, coalition agreements, how coalitions discipline and collapse, with concrete European examples.',
  },
  {
    slotId: 'leadership-succession-problem',
    subjectId: 'leadership',
    subject: 'Leadership',
    topic: 'Power',
    title: 'The Succession Problem',
    brief: 'Why handing over power is the hardest leadership act: historical successions that worked and failed, founder syndrome, the incentives that make leaders cling, and what durable institutions do differently.',
  },
];

export function slotsForSubject(subjectId) {
  return LESSON_SLOTS.filter((slot) => slot.subjectId === subjectId);
}

export function slotById(slotId) {
  return LESSON_SLOTS.find((slot) => slot.slotId === slotId) || null;
}
