import { getSupabaseSessionState } from './supabaseAuth.js';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabase.js';

export const GENERATED_LESSONS_TABLE = 'generated_lessons';

const CACHE_KEY = 'curiosity.generatedLessons.v1';

export function normalizeGeneratedLessonRow(row) {
  if (!row?.slot_id || !row?.lesson) return null;
  const pages = Array.isArray(row.lesson.pages) ? row.lesson.pages.filter(Boolean) : [];
  if (pages.length === 0) return null;
  return {
    slotId: row.slot_id,
    title: row.lesson.title || row.slot_id,
    openingLine: row.lesson.openingLine || '',
    pages,
    model: row.model || '',
    generatedBy: row.generated_by || '',
    createdAt: row.created_at || null,
  };
}

export function loadGeneratedLessonsCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && typeof cached === 'object' && !Array.isArray(cached)) return cached;
  } catch {
    // fall through to empty
  }
  return {};
}

export function saveGeneratedLessonsCache(lessonsBySlot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(lessonsBySlot));
  } catch {
    // Cache is an offline convenience only.
  }
}

export async function fetchGeneratedLessons() {
  if (!isSupabaseConfigured()) return {};

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(GENERATED_LESSONS_TABLE)
    .select('slot_id, lesson, model, generated_by, created_at');

  if (error) throw new Error(error.message || 'Could not load the shared library.');

  const lessonsBySlot = {};
  for (const row of data || []) {
    const lesson = normalizeGeneratedLessonRow(row);
    if (lesson) lessonsBySlot[lesson.slotId] = lesson;
  }
  saveGeneratedLessonsCache(lessonsBySlot);
  return lessonsBySlot;
}

// Publishes a pipeline result as canon. The slot_id primary key is the race
// guard: if someone else published this slot first, the insert fails with a
// unique violation and we return their lesson instead of ours.
export async function publishGeneratedLesson({ slotId, lesson, model, verificationNotes }) {
  if (!isSupabaseConfigured()) {
    throw new Error('Cloud sync is not configured, so the shared library is unavailable.');
  }
  const sessionState = await getSupabaseSessionState();
  if (!sessionState.user) {
    throw new Error('Sign in before publishing to the shared library.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(GENERATED_LESSONS_TABLE)
    .insert({
      slot_id: slotId,
      lesson,
      model,
      generated_by: sessionState.user.id,
      verification_notes: verificationNotes || null,
    })
    .select('slot_id, lesson, model, generated_by, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from(GENERATED_LESSONS_TABLE)
        .select('slot_id, lesson, model, generated_by, created_at')
        .eq('slot_id', slotId)
        .maybeSingle();
      const theirs = normalizeGeneratedLessonRow(existing);
      if (theirs) return { lesson: theirs, alreadyPublished: true };
    }
    throw new Error(error.message || 'Could not publish the lesson.');
  }

  return { lesson: normalizeGeneratedLessonRow(data), alreadyPublished: false };
}
