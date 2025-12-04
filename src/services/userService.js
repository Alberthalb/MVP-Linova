import { supabase } from "./supabase";

const profileTable = "user_profiles";
const initialQuizTable = "initial_quiz_questions";
const initialQuizResultsTable = "initial_quiz_results";
const lessonsCompletedTable = "user_lessons_completed";
const moduleUnlocksTable = "user_module_unlocks";

export const createOrUpdateUserProfile = async (uid, payload = {}) => {
  if (!uid) return;
  const {
    createdAt,
    updatedAt,
    currentModuleId,
    current_module_id,
    initialQuizSuggestedLevel,
    initialQuizScore,
    initialQuizAverage,
    initialQuizCompleted,
    ...rest
  } = payload;

  const body = {
    user_id: uid,
    updated_at: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
    current_module_id: current_module_id || currentModuleId,
    initialquizsuggestedlevel: initialQuizSuggestedLevel,
    initialquizscore: initialQuizScore,
    initialquizaverage: initialQuizAverage,
    initialquizcompleted: initialQuizCompleted,
    ...rest,
  };
  if (createdAt) {
    body.created_at = new Date(createdAt).toISOString();
  }

  const { error } = await supabase.from(profileTable).upsert(body);
  if (error) throw error;
};

export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const { data, error } = await supabase.from(profileTable).select("*").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return data || null;
};

export const fetchInitialQuizQuestions = async () => {
  const { data, error } = await supabase.from(initialQuizTable).select("*").order("order", { ascending: true });
  if (error) throw error;
  return (data || []).map((q, index) => ({
    id: q.id || String(index + 1),
    question: q.question || "",
    options: q.options || [],
    correct: q.correct ?? null,
    order: q.order ?? index,
    value: q.value ?? null,
  }));
};

export const saveInitialQuizResult = async (uid, payload = {}) => {
  if (!uid) return;
  const { suggestedLevel, startingLevel, ...rest } = payload;
  const body = {
    user_id: uid,
    updated_at: new Date().toISOString(),
    suggested_level: suggestedLevel,
    starting_level: startingLevel,
    ...rest,
  };
  const { error } = await supabase.from(initialQuizResultsTable).upsert(body);
  if (error) throw error;
};

export const saveLessonProgress = async (uid, lessonId, payload = {}) => {
  if (!uid || !lessonId) return;
  const { lessonTitle, lesson_title } = payload;
  const body = {
    user_id: uid,
    lesson_id: lessonId,
    lesson_title: lessonTitle || lesson_title || null,
    score: payload?.score ?? null,
    watched: payload?.watched ?? null,
    completed: payload?.completed ?? null,
    xp: payload?.xp ?? 0,
    answers: payload?.answers ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(lessonsCompletedTable).upsert(body);
  if (error) throw error;
};

export const saveLessonQuizResult = async (uid, lessonId, payload = {}) => {
  if (!uid || !lessonId) return;
  const body = {
    user_id: uid,
    lesson_id: lessonId,
    score: payload?.score ?? null,
    correctcount: payload?.correctAnswers ?? payload?.correctcount ?? null,
    totalquestions: payload?.totalQuestions ?? payload?.totalquestions ?? null,
    passed: payload?.passed ?? null,
    answers: payload?.answers ?? null,
  };
  const { error } = await supabase.from("user_lesson_quiz_results").insert(body);
  if (error) throw error;
};

export const saveModuleUnlock = async (uid, moduleId, payload = {}) => {
  if (!uid || !moduleId) return;
  const { correctCount, totalQuestions, unlockedAt, moduleTitle, ...rest } = payload;
  const body = {
    user_id: uid,
    module_id: moduleId,
    passed: payload?.passed ?? true,
    status: payload?.status || "unlocked",
    score: payload?.score,
    correctcount: correctCount,
    totalquestions: totalQuestions,
    reason: rest?.reason,
    unlocked_at: unlockedAt ? new Date(unlockedAt).toISOString() : new Date().toISOString(),
  };
  const { error } = await supabase.from(moduleUnlocksTable).upsert(body);
  if (error) throw error;
};
