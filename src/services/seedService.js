import { supabase } from "./supabase";

const MODULES = [
  { id: "module-a1", title: "Módulo A1", description: "Primeiros passos e vocabulário básico.", level_tag: "A1", order: 0 },
  { id: "module-a2", title: "Módulo A2", description: "Rotinas e situações frequentes.", level_tag: "A2", order: 1 },
];

const MODULE_ASSESSMENT_QUESTIONS = [
  { id: "a1-q1", module_id: "module-a1", question: "Você consegue se apresentar em inglês?", options: ["Ainda não", "Com ajuda", "Sim, tranquilo"], correct: 2, order: 0 },
  { id: "a1-q2", module_id: "module-a1", question: "Consegue entender cumprimentos simples?", options: ["Não", "Às vezes", "Sim"], correct: 2, order: 1 },
  { id: "a2-q1", module_id: "module-a2", question: "Consegue descrever sua rotina diária?", options: ["Não", "Com esforço", "Sim"], correct: 2, order: 0 },
  { id: "a2-q2", module_id: "module-a2", question: "Consegue pedir comida em um restaurante?", options: ["Não", "Com esforço", "Sim"], correct: 2, order: 1 },
];

const LESSONS = [
  { id: "lesson-a1-1", module_id: "module-a1", title: "Saudações e apresentações", level: "A1", order: 0, duration_ms: 300000, video_url: "https://example.com/video/a1-1.mp4", transcript: "Hello, my name is..." },
  { id: "lesson-a1-2", module_id: "module-a1", title: "Alfabeto e números", level: "A1", order: 1, duration_ms: 300000, video_url: "https://example.com/video/a1-2.mp4", transcript: "Alphabet and numbers basics." },
  { id: "lesson-a2-1", module_id: "module-a2", title: "Falando sobre rotina", level: "A2", order: 0, duration_ms: 300000, video_url: "https://example.com/video/a2-1.mp4", transcript: "Daily routine phrases." },
  { id: "lesson-a2-2", module_id: "module-a2", title: "No restaurante", level: "A2", order: 1, duration_ms: 300000, video_url: "https://example.com/video/a2-2.mp4", transcript: "Ordering food and drinks." },
];

const LESSON_QUIZZES = [
  { id: "quiz-a1-2-q1", lesson_id: "lesson-a1-2", question: "Como se diz número 5 em inglês?", options: ["Four", "Five", "Six"], correct: 1, order: 0 },
  { id: "quiz-a1-2-q2", lesson_id: "lesson-a1-2", question: "Qual é a letra depois de C?", options: ["B", "D", "E"], correct: 1, order: 1 },
  { id: "quiz-a2-1-q1", lesson_id: "lesson-a2-1", question: "Como dizer que você acorda às 7?", options: ["I wake up at seven", "I go to bed at seven", "I eat at seven"], correct: 0, order: 0 },
  { id: "quiz-a2-2-q1", lesson_id: "lesson-a2-2", question: "Como pedir água?", options: ["One coffee", "A glass of water, please", "The bill, please"], correct: 1, order: 0 },
];

const INITIAL_QUIZ_QUESTIONS = [
  { id: "init-1", question: "Você entende cumprimentos simples em inglês?", options: ["Ainda não", "Parcialmente", "Sim"], value: 1, order: 0 },
  { id: "init-2", question: "Consegue ler textos curtos?", options: ["Não", "Com ajuda", "Sim"], value: 1, order: 1 },
  { id: "init-3", question: "Consegue se apresentar?", options: ["Não", "Com ajuda", "Sim"], value: 1, order: 2 },
];

export const ensureSeedData = async () => {
  try {
    const { data: modulesData } = await supabase.from("modules").select("id");
    if (modulesData && modulesData.length > 0) {
      return;
    }
  } catch (error) {
    console.warn("[Seed] Falha ao verificar módulos:", error);
  }

  try {
    await supabase.from("modules").upsert(MODULES);
    await supabase.from("module_assessment_questions").upsert(MODULE_ASSESSMENT_QUESTIONS);
    await supabase.from("lessons").upsert(LESSONS);
    await supabase.from("lesson_quizzes").upsert(LESSON_QUIZZES);
    await supabase.from("initial_quiz_questions").upsert(INITIAL_QUIZ_QUESTIONS);
    // Quiz embutido na lesson-a1-1
    await supabase
      .from("lessons")
      .update({
        quiz: [
          { id: "q1", question: "Como dizer oi?", options: ["Hello", "Bye", "Thanks"], correct: 0 },
          { id: "q2", question: "Como dizer obrigado?", options: ["Please", "Thanks", "Sorry"], correct: 1 },
        ],
      })
      .eq("id", "lesson-a1-1");
    console.warn("[Seed] Dados de módulos/aulas/quizzes inseridos (on conflict do nothing).");
  } catch (error) {
    console.warn("[Seed] Falha ao inserir seeds:", error);
  }
};
