-- Supabase schema for Linova (PostgreSQL)
-- Execute in the target Supabase project (SQL editor or psql).
-- Tables are idempotent via IF NOT EXISTS.

-- Catalog: modules
create table if not exists public.modules (
  id text primary key,
  title text not null default '',
  description text default '',
  level_tag text,
  "order" integer default 0,
  created_at timestamptz not null default now()
);

-- Assessment questions per module
create table if not exists public.module_assessment_questions (
  id text primary key,
  module_id text not null references public.modules(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct integer not null default 0,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_module_assessment_questions_module_id on public.module_assessment_questions(module_id);
create index if not exists idx_module_assessment_questions_order on public.module_assessment_questions(module_id, "order");

-- Lessons
create table if not exists public.lessons (
  id text primary key,
  module_id text references public.modules(id) on delete set null,
  title text not null default '',
  level text,
  "order" integer default 0,
  duration_ms integer,
  video_url text,
  video_path text,
  caption_url text,
  caption_path text,
  transcript text,
  quiz jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_lessons_module_id on public.lessons(module_id);
create index if not exists idx_lessons_order on public.lessons(module_id, "order");

-- Lesson quizzes (optional; use if you prefer a separate table instead of lessons.quiz)
create table if not exists public.lesson_quizzes (
  id text primary key,
  lesson_id text not null references public.lessons(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct integer not null default 0,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_lesson_quizzes_lesson_id on public.lesson_quizzes(lesson_id);
create index if not exists idx_lesson_quizzes_order on public.lesson_quizzes(lesson_id, "order");

-- User profile
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  level text,
  current_module_id text references public.modules(id),
  initialquizsuggestedlevel text,
  initialquizscore integer,
  initialquizaverage numeric,
  initialquizcompleted boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Initial quiz questions
create table if not exists public.initial_quiz_questions (
  id text primary key,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  value integer,
  correct integer,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_initial_quiz_questions_order on public.initial_quiz_questions("order");

-- Initial quiz results
create table if not exists public.initial_quiz_results (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric,
  average numeric,
  suggested_level text,
  starting_level text,
  updated_at timestamptz not null default now()
);

-- Lesson progress per user
create table if not exists public.user_lessons_completed (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  lesson_title text,
  score numeric,
  watched boolean,
  completed boolean,
  xp integer not null default 10,
  answers jsonb,
  updated_at timestamptz not null default now(),
  constraint user_lessons_completed_pkey primary key (user_id, lesson_id)
);
create index if not exists idx_user_lessons_completed_user on public.user_lessons_completed(user_id);
create index if not exists idx_user_lessons_completed_lesson on public.user_lessons_completed(lesson_id);

-- Lesson quiz results (per attempt)
create table if not exists public.user_lesson_quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  score numeric,
  correctcount integer,
  totalquestions integer,
  passed boolean default false,
  answers jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_lesson_quiz_results_user on public.user_lesson_quiz_results(user_id);
create index if not exists idx_user_lesson_quiz_results_lesson on public.user_lesson_quiz_results(lesson_id);
create index if not exists idx_user_lesson_quiz_results_created on public.user_lesson_quiz_results(created_at);

-- Module unlocks per user
create table if not exists public.user_module_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null references public.modules(id) on delete cascade,
  passed boolean default true,
  status text default 'unlocked',
  score numeric,
  correctcount integer,
  totalquestions integer,
  reason text,
  unlocked_at timestamptz not null default now(),
  constraint user_module_unlocks_pkey primary key (user_id, module_id)
);
create index if not exists idx_user_module_unlocks_user on public.user_module_unlocks(user_id);
create index if not exists idx_user_module_unlocks_module on public.user_module_unlocks(module_id);

-- Helper: ensure updated_at gets touched (optional; comment out if undesired)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_user_profiles_updated_at') then
    create trigger set_user_profiles_updated_at before update on public.user_profiles
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_user_lessons_completed_updated_at') then
    create trigger set_user_lessons_completed_updated_at before update on public.user_lessons_completed
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_initial_quiz_results_updated_at') then
    create trigger set_initial_quiz_results_updated_at before update on public.initial_quiz_results
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- RLS: enable on all tables
alter table if exists public.modules enable row level security;
alter table if exists public.module_assessment_questions enable row level security;
alter table if exists public.lessons enable row level security;
alter table if exists public.lesson_quizzes enable row level security;
alter table if exists public.user_profiles enable row level security;
alter table if exists public.initial_quiz_questions enable row level security;
alter table if exists public.initial_quiz_results enable row level security;
alter table if exists public.user_lessons_completed enable row level security;
alter table if exists public.user_lesson_quiz_results enable row level security;
alter table if exists public.user_module_unlocks enable row level security;

-- Optional: force RLS so future superuser policies are not bypassed
alter table if exists public.user_profiles force row level security;
alter table if exists public.initial_quiz_results force row level security;
alter table if exists public.user_lessons_completed force row level security;
alter table if exists public.user_module_unlocks force row level security;

-- Policies for catalog (public read)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'modules' and policyname = 'Allow read modules') then
    create policy "Allow read modules" on public.modules for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'module_assessment_questions' and policyname = 'Allow read module_assessment_questions') then
    create policy "Allow read module_assessment_questions" on public.module_assessment_questions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lessons' and policyname = 'Allow read lessons') then
    create policy "Allow read lessons" on public.lessons for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lesson_quizzes' and policyname = 'Allow read lesson_quizzes') then
    create policy "Allow read lesson_quizzes" on public.lesson_quizzes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'initial_quiz_questions' and policyname = 'Allow read initial_quiz_questions') then
    create policy "Allow read initial_quiz_questions" on public.initial_quiz_questions for select using (true);
  end if;
end;
$$;

-- Policies for user-scoped tables (auth.uid() owns row)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'user_profiles' and policyname = 'User manage own profile') then
    create policy "User manage own profile" on public.user_profiles
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'initial_quiz_results' and policyname = 'User manage own initial_quiz_results') then
    create policy "User manage own initial_quiz_results" on public.initial_quiz_results
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_lessons_completed' and policyname = 'User manage own lessons_completed') then
    create policy "User manage own lessons_completed" on public.user_lessons_completed
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_lesson_quiz_results' and policyname = 'User manage own lesson_quiz_results') then
    create policy "User manage own lesson_quiz_results" on public.user_lesson_quiz_results
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_module_unlocks' and policyname = 'User manage own module_unlocks') then
    create policy "User manage own module_unlocks" on public.user_module_unlocks
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;

-- TEMP: Disable RLS on all tables (policies remain but are ignored while RLS is disabled)
alter table if exists public.modules disable row level security;
alter table if exists public.module_assessment_questions disable row level security;
alter table if exists public.lessons disable row level security;
alter table if exists public.lesson_quizzes disable row level security;
alter table if exists public.user_profiles disable row level security;
alter table if exists public.initial_quiz_questions disable row level security;
alter table if exists public.initial_quiz_results disable row level security;
alter table if exists public.user_lessons_completed disable row level security;
alter table if exists public.user_lesson_quiz_results disable row level security;
alter table if exists public.user_module_unlocks disable row level security;

-- Seed: módulos, aulas, quizzes de módulo e aulas, perguntas do quiz inicial (ajuste conforme necessário)
insert into public.modules (id, title, description, level_tag, "order")
values
  ('module-a1', 'Módulo A1', 'Primeiros passos e vocabulário básico.', 'A1', 0),
  ('module-a2', 'Módulo A2', 'Rotinas e situações frequentes.', 'A2', 1)
on conflict (id) do nothing;

insert into public.module_assessment_questions (id, module_id, question, options, correct, "order")
values
  ('a1-q1', 'module-a1', 'Você consegue se apresentar em inglês?', '["Ainda não","Com ajuda","Sim, tranquilo"]', 2, 0),
  ('a1-q2', 'module-a1', 'Consegue entender cumprimentos simples?', '["Não","Às vezes","Sim"]', 2, 1),
  ('a2-q1', 'module-a2', 'Consegue descrever sua rotina diária?', '["Não","Com esforço","Sim"]', 2, 0),
  ('a2-q2', 'module-a2', 'Consegue pedir comida em um restaurante?', '["Não","Com esforço","Sim"]', 2, 1)
on conflict (id) do nothing;

insert into public.lessons (id, module_id, title, level, "order", duration_ms, video_url, transcript)
values
  ('lesson-a1-1', 'module-a1', 'Saudações e apresentações', 'A1', 0, 300000, 'https://example.com/video/a1-1.mp4', 'Hello, my name is...'),
  ('lesson-a1-2', 'module-a1', 'Alfabeto e números', 'A1', 1, 300000, 'https://example.com/video/a1-2.mp4', 'Alphabet and numbers basics.'),
  ('lesson-a2-1', 'module-a2', 'Falando sobre rotina', 'A2', 0, 300000, 'https://example.com/video/a2-1.mp4', 'Daily routine phrases.'),
  ('lesson-a2-2', 'module-a2', 'No restaurante', 'A2', 1, 300000, 'https://example.com/video/a2-2.mp4', 'Ordering food and drinks.')
on conflict (id) do nothing;

-- Opcional: quiz embutido na tabela lessons (campo quiz jsonb)
update public.lessons
set quiz = '[
  {"id":"q1","question":"Como dizer oi?","options":["Hello","Bye","Thanks"],"correct":0},
  {"id":"q2","question":"Como dizer obrigado?","options":["Please","Thanks","Sorry"],"correct":1}
]'
where id = 'lesson-a1-1';

-- Quizzes de aula em tabela separada (lesson_quizzes)
insert into public.lesson_quizzes (id, lesson_id, question, options, correct, "order")
values
  ('quiz-a1-2-q1', 'lesson-a1-2', 'Como se diz número 5 em inglês?', '["Four","Five","Six"]', 1, 0),
  ('quiz-a1-2-q2', 'lesson-a1-2', 'Qual é a letra depois de C?', '["B","D","E"]', 1, 1),
  ('quiz-a2-1-q1', 'lesson-a2-1', 'Como dizer que você acorda às 7?', '["I wake up at seven","I go to bed at seven","I eat at seven"]', 0, 0),
  ('quiz-a2-2-q1', 'lesson-a2-2', 'Como pedir água?', '["One coffee","A glass of water, please","The bill, please"]', 1, 0)
on conflict (id) do nothing;

-- Perguntas do quiz inicial
insert into public.initial_quiz_questions (id, question, options, value, "order")
values
  ('init-1', 'Você entende cumprimentos simples em inglês?', '["Ainda não","Parcialmente","Sim"]', 1, 0),
  ('init-2', 'Consegue ler textos curtos?', '["Não","Com ajuda","Sim"]', 1, 1),
  ('init-3', 'Consegue se apresentar?', '["Não","Com ajuda","Sim"]', 1, 2)
on conflict (id) do nothing;

-- Nova aula teste (Supabase Storage): Saudacoes e Apresentacoes (A1)
insert into public.lessons (id, module_id, title, level, "order", duration_ms, video_path, caption_path, transcript)
values
  ('lesson-a1-3', 'module-a1', 'Saudacoes e Apresentacoes', 'A1', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Como se apresentar e cumprimentar pessoas de forma clara e simples.')
on conflict (id) do nothing;

-- Quiz da nova aula (3 perguntas)
insert into public.lesson_quizzes (id, lesson_id, question, options, correct, "order")
values
  ('quiz-a1-3-q1', 'lesson-a1-3', 'Como dizer "prazer em conhecer"?', '["Nice to meet you","See you later","How are you"]', 0, 0),
  ('quiz-a1-3-q2', 'lesson-a1-3', 'Qual saudacao e adequada de manha?', '["Good night","Good morning","Good evening"]', 1, 1),
  ('quiz-a1-3-q3', 'lesson-a1-3', 'Como se apresentar dizendo seu nome?', '["I am from Brazil","My name is...","Thank you"]', 1, 2)
on conflict (id) do nothing;
