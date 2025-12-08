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
  user_name text,
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
  user_name text,
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
create index if not exists idx_user_lessons_completed_user_updated on public.user_lessons_completed(user_id, updated_at desc);

-- Lesson quiz results (per attempt)
create table if not exists public.user_lesson_quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text,
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
  user_name text,
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
alter table if exists public.modules force row level security;
alter table if exists public.module_assessment_questions force row level security;
alter table if exists public.lessons force row level security;
alter table if exists public.lesson_quizzes force row level security;
alter table if exists public.initial_quiz_questions force row level security;

-- Helper: verifica se a role atual é service_role (para liberar escrita só no backend)
create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

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

-- Policies for catalog writes (somente service_role / backend)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'modules' and policyname = 'Service role manage modules') then
    create policy "Service role manage modules" on public.modules
      for all using (public.is_service_role()) with check (public.is_service_role());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'module_assessment_questions' and policyname = 'Service role manage module_assessment_questions') then
    create policy "Service role manage module_assessment_questions" on public.module_assessment_questions
      for all using (public.is_service_role()) with check (public.is_service_role());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lessons' and policyname = 'Service role manage lessons') then
    create policy "Service role manage lessons" on public.lessons
      for all using (public.is_service_role()) with check (public.is_service_role());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lesson_quizzes' and policyname = 'Service role manage lesson_quizzes') then
    create policy "Service role manage lesson_quizzes" on public.lesson_quizzes
      for all using (public.is_service_role()) with check (public.is_service_role());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'initial_quiz_questions' and policyname = 'Service role manage initial_quiz_questions') then
    create policy "Service role manage initial_quiz_questions" on public.initial_quiz_questions
      for all using (public.is_service_role()) with check (public.is_service_role());
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


-- ------------------------------------------------------------
-- SEED SIMPLES (pronto para Table Editor)
-- Edite/exclua o que quiser; IDs são textos amigáveis.
-- ------------------------------------------------------------

-- Módulos por nível (A1..C2)
insert into public.modules (id, title, description, level_tag, "order") values
  ('module-a1', 'Módulo A1', 'Primeiros passos e vocabulário básico.', 'A1', 0),
  ('module-a2', 'Módulo A2', 'Rotinas e situações frequentes.', 'A2', 1),
  ('module-b1', 'Módulo B1', 'Conversação intermediária e situações de trabalho.', 'B1', 2),
  ('module-b2', 'Módulo B2', 'Fluência intermediária alta e discussões complexas.', 'B2', 3),
  ('module-c1', 'Módulo C1', 'Proficiência avançada em contexto acadêmico e profissional.', 'C1', 4),
  ('module-c2', 'Módulo C2', 'Domínio quase nativo e comunicação sofisticada.', 'C2', 5)
on conflict (id) do nothing;

-- Perguntas de prova por módulo (3 cada, editável via Table Editor)
insert into public.module_assessment_questions (id, module_id, question, options, correct, "order") values
  ('a1-q1', 'module-a1', 'Consegue se apresentar em inglês?', '["Não","Com ajuda","Sim"]', 2, 0),
  ('a1-q2', 'module-a1', 'Consegue entender cumprimentos simples?', '["Não","Às vezes","Sim"]', 2, 1),
  ('a1-q3', 'module-a1', 'Consegue perguntar horas ou direções básicas?', '["Não","Com ajuda","Sim"]', 2, 2),
  ('a2-q1', 'module-a2', 'Consegue descrever sua rotina diária?', '["Não","Com esforço","Sim"]', 2, 0),
  ('a2-q2', 'module-a2', 'Consegue pedir comida em um restaurante?', '["Não","Com esforço","Sim"]', 2, 1),
  ('a2-q3', 'module-a2', 'Consegue falar sobre planos futuros?', '["Não","Às vezes","Sim"]', 2, 2),
  ('b1-q1', 'module-b1', 'Consegue participar de reuniões simples?', '["Não","Com ajuda","Sim"]', 2, 0),
  ('b1-q2', 'module-b1', 'Consegue descrever experiências passadas?', '["Não","Parcial","Sim"]', 2, 1),
  ('b1-q3', 'module-b1', 'Consegue negociar prazos?', '["Não","Com ajuda","Sim"]', 2, 2),
  ('b2-q1', 'module-b2', 'Consegue sustentar uma opinião em debates?', '["Não","Às vezes","Sim"]', 2, 0),
  ('b2-q2', 'module-b2', 'Consegue entender podcasts sem legenda?', '["Não","Depende","Sim"]', 2, 1),
  ('b2-q3', 'module-b2', 'Consegue redigir e-mails formais?', '["Não","Com ajuda","Sim"]', 2, 2),
  ('c1-q1', 'module-c1', 'Consegue apresentar projetos complexos?', '["Não","Com ajuda","Sim"]', 2, 0),
  ('c1-q2', 'module-c1', 'Consegue interpretar textos técnicos longos?', '["Não","Depende","Sim"]', 2, 1),
  ('c1-q3', 'module-c1', 'Consegue negociar e persuadir?', '["Não","Com ajuda","Sim"]', 2, 2),
  ('c2-q1', 'module-c2', 'Consegue comunicar-se como nativo?', '["Não","Quase","Sim"]', 2, 0),
  ('c2-q2', 'module-c2', 'Consegue interpretar ironia e nuances?', '["Não","Depende","Sim"]', 2, 1),
  ('c2-q3', 'module-c2', 'Consegue moderar discussões complexas?', '["Não","Às vezes","Sim"]', 2, 2)
on conflict (id) do nothing;

-- Aulas (3 por módulo). Reaproveite video_path/caption_path do Storage
insert into public.lessons (id, module_id, title, level, "order", duration_ms, video_path, caption_path, transcript) values
  ('lesson-a1-1', 'module-a1', 'Saudações e apresentações', 'A1', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Hello, my name is...'),
  ('lesson-a1-2', 'module-a1', 'Alfabeto e números', 'A1', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Alphabet and numbers basics.'),
  ('lesson-a1-3', 'module-a1', 'Frases do dia a dia', 'A1', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Frases básicas para o cotidiano.'),
  ('lesson-a2-1', 'module-a2', 'Falando sobre rotina', 'A2', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Daily routine phrases.'),
  ('lesson-a2-2', 'module-a2', 'No restaurante', 'A2', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Ordering food and drinks.'),
  ('lesson-a2-3', 'module-a2', 'Planos futuros', 'A2', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Falando de planos e horários.'),
  ('lesson-b1-1', 'module-b1', 'Reuniões de trabalho', 'B1', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Frases para reuniões simples.'),
  ('lesson-b1-2', 'module-b1', 'Descrevendo experiências', 'B1', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Relatar experiências passadas.'),
  ('lesson-b1-3', 'module-b1', 'Negociando prazos', 'B1', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Linguagem de negociação.'),
  ('lesson-b2-1', 'module-b2', 'Debates e opiniões', 'B2', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Sustentando argumentos.'),
  ('lesson-b2-2', 'module-b2', 'Podcasts sem legenda', 'B2', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Estratégias de áudio.'),
  ('lesson-b2-3', 'module-b2', 'E-mails formais', 'B2', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Estrutura de e-mail profissional.'),
  ('lesson-c1-1', 'module-c1', 'Apresentações avançadas', 'C1', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Projetos complexos.'),
  ('lesson-c1-2', 'module-c1', 'Textos técnicos', 'C1', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Lendo textos técnicos.'),
  ('lesson-c1-3', 'module-c1', 'Registro formal e informal', 'C1', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Ajustando tom.'),
  ('lesson-c2-1', 'module-c2', 'Discurso quase nativo', 'C2', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Nuances de fluência.'),
  ('lesson-c2-2', 'module-c2', 'Ironia e contexto', 'C2', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Entendendo ironia.'),
  ('lesson-c2-3', 'module-c2', 'Textos longos e coesos', 'C2', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Redação coesa.')
on conflict (id) do nothing;

-- Quizzes das aulas (2 perguntas cada, editáveis no Table Editor)
insert into public.lesson_quizzes (id, lesson_id, question, options, correct, "order") values
  ('quiz-a1-1-q1', 'lesson-a1-1', 'Como dizer oi?', '["Hello","Bye","Thanks"]', 0, 0),
  ('quiz-a1-1-q2', 'lesson-a1-1', 'Como dizer obrigado?', '["Please","Thanks","Sorry"]', 1, 1),
  ('quiz-a1-2-q1', 'lesson-a1-2', 'Número 5 em inglês?', '["Four","Five","Six"]', 1, 0),
  ('quiz-a1-2-q2', 'lesson-a1-2', 'Letra após C?', '["B","D","E"]', 1, 1),
  ('quiz-a1-3-q1', 'lesson-a1-3', 'Frase do dia a dia:', '["How are you?","Give me money","Where is the cat?"]', 0, 0),
  ('quiz-a1-3-q2', 'lesson-a1-3', 'Perguntar nome:', '["What is your name?","Where are you?","How old?"]', 0, 1),
  ('quiz-a2-1-q1', 'lesson-a2-1', 'Acorda às 7:', '["I wake up at seven","I sleep at seven","I eat at seven"]', 0, 0),
  ('quiz-a2-1-q2', 'lesson-a2-1', 'Expressa rotina:', '["Every day I...","Where is...","How much?"]', 0, 1),
  ('quiz-a2-2-q1', 'lesson-a2-2', 'Pedir água:', '["A glass of water, please","The bill, please","One coffee"]', 0, 0),
  ('quiz-a2-2-q2', 'lesson-a2-2', 'Pedir conta:', '["Can I have the check?","Where is the bus?","I am fine"]', 0, 1),
  ('quiz-a2-3-q1', 'lesson-a2-3', 'Plano futuro:', '["I am going to travel","I went to travel","I was travel"]', 0, 0),
  ('quiz-a2-3-q2', 'lesson-a2-3', 'Falar horário:', '["At 8 pm","Under the bed","Next to car"]', 0, 1),
  ('quiz-b1-1-q1', 'lesson-b1-1', 'Pedir update:', '["Can we get an update?","Where is bus?","How old are you?"]', 0, 0),
  ('quiz-b1-1-q2', 'lesson-b1-1', 'Status da tarefa:', '["It is in progress","I am sleeping","No idea"]', 0, 1),
  ('quiz-b1-2-q1', 'lesson-b1-2', 'Relatar passado:', '["I did","I will do","I am doing"]', 0, 0),
  ('quiz-b1-2-q2', 'lesson-b1-2', 'Detalhar experiência:', '["Last year I worked...","Where is cafe?","I am hungry"]', 0, 1),
  ('quiz-b1-3-q1', 'lesson-b1-3', 'Negociar prazo:', '["Can we extend the deadline?","Where is coffee?","See you"]', 0, 0),
  ('quiz-b1-3-q2', 'lesson-b1-3', 'Concordar com prazo:', '["Sounds good","No thanks","Bye"]', 0, 1),
  ('quiz-b2-1-q1', 'lesson-b2-1', 'Frase de debate:', '["I disagree because...","I am hungry","Nice to meet you"]', 0, 0),
  ('quiz-b2-1-q2', 'lesson-b2-1', 'Manter opinião:', '["Let me explain why","Where is bus","See you"]', 0, 1),
  ('quiz-b2-2-q1', 'lesson-b2-2', 'Estratégia de podcast:', '["Focus on key words","Ignore audio","Turn off sound"]', 0, 0),
  ('quiz-b2-2-q2', 'lesson-b2-2', 'Verbos úteis:', '["Listen, predict, infer","Sleep, eat, run","Jump, sit, lay"]', 0, 1),
  ('quiz-b2-3-q1', 'lesson-b2-3', 'Saudação formal:', '["Dear team","Hey dude","Sup"]', 0, 0),
  ('quiz-b2-3-q2', 'lesson-b2-3', 'Encerrar e-mail:', '["Best regards","Later","Bye bye"]', 0, 1),
  ('quiz-b2-4-q1', 'lesson-b2-4', 'Pergunta sobre notícia:', '["What happened?","What is your name?","Where am I?"]', 0, 0),
  ('quiz-b2-4-q2', 'lesson-b2-4', 'Opinar sobre notícia:', '["In my opinion...","I am hungry","I am late"]', 0, 1),
  ('quiz-c1-1-q1', 'lesson-c1-1', 'Abrir apresentação:', '["Thank you for coming","What time is it?","See you"]', 0, 0),
  ('quiz-c1-1-q2', 'lesson-c1-1', 'Conectar ideias:', '["Firstly... secondly","I like pizza","Where is bus"]', 0, 1),
  ('quiz-c1-2-q1', 'lesson-c1-2', 'Checar entendimento:', '["If I understood correctly","Where is exit","I am lost"]', 0, 0),
  ('quiz-c1-2-q2', 'lesson-c1-2', 'Termo técnico:', '["Bandwidth","Potato","Umbrella"]', 0, 1),
  ('quiz-c1-3-q1', 'lesson-c1-3', 'Tom formal:', '["May I suggest","Gimme that","Yo listen"]', 0, 0),
  ('quiz-c1-3-q2', 'lesson-c1-3', 'Tom informal:', '["Hey, wanna...","Please accept","In conclusion"]', 0, 1),
  ('quiz-c1-4-q1', 'lesson-c1-4', 'Persuadir:', '["Consider this benefit","No way","I hate this"]', 0, 0),
  ('quiz-c1-4-q2', 'lesson-c1-4', 'Negociar:', '["Can we find a middle ground?","Where is coffee?","I give up"]', 0, 1),
  ('quiz-c2-1-q1', 'lesson-c2-1', 'Nuance de fluência:', '["Use idioms naturally","Avoid speaking","Only slang"]', 0, 0),
  ('quiz-c2-1-q2', 'lesson-c2-1', 'Feedback avançado:', '["Could you refine this point?","I am hungry","No idea"]', 0, 1),
  ('quiz-c2-2-q1', 'lesson-c2-2', 'Ironia:', '["Tone and context matter","Check the bus","Ask the time"]', 0, 0),
  ('quiz-c2-2-q2', 'lesson-c2-2', 'Sarcasmo:', '["Note the exaggeration","I need coffee","Bye"]', 0, 1),
  ('quiz-c2-3-q1', 'lesson-c2-3', 'Coesão:', '["Use connectors","Delete paragraphs","Add slang"]', 0, 0),
  ('quiz-c2-3-q2', 'lesson-c2-3', 'Parágrafo:', '["Topic sentence first","Random words","Emojis only"]', 0, 1),
  ('quiz-c2-4-q1', 'lesson-c2-4', 'Moderando debate:', '["Let''s hear one at a time","Everybody shout","Skip intros"]', 0, 0),
  ('quiz-c2-4-q2', 'lesson-c2-4', 'Concluir debate:', '["Thanks for your points","Where is bus","I am leaving"]', 0, 1)
on conflict (id) do nothing;

-- Quiz inicial (pode editar no Table Editor)
insert into public.initial_quiz_questions (id, question, options, value, "order") values
  ('init-1', 'Você entende cumprimentos simples em inglês?', '["Ainda Não","Parcialmente","Sim"]', 1, 0),
  ('init-2', 'Consegue ler textos curtos?', '["Não","Com ajuda","Sim"]', 1, 1),
  ('init-3', 'Consegue se apresentar?', '["Não","Com ajuda","Sim"]', 1, 2)
on conflict (id) do nothing;

-- Módulos extras (A2+, B1+, B2+, C1+) com aulas e quizzes (reuso de vídeo/legenda existentes)
insert into public.modules (id, title, description, level_tag, "order") values
  ('module-a2plus', 'Módulo A2+', 'Lê e escreve mensagens curtas com mais confiança.', 'A2+', 2),
  ('module-b1plus', 'Módulo B1+', 'Comunica-se em situações variadas com poucos deslizes.', 'B1+', 4),
  ('module-b2plus', 'Módulo B2+', 'Argumenta e compreende nuances em temas mais complexos.', 'B2+', 6),
  ('module-c1plus', 'Módulo C1+', 'Navega temas abstratos e técnicos com alta precisão.', 'C1+', 8)
on conflict (id) do nothing;

insert into public.module_assessment_questions (id, module_id, question, options, correct, "order") values
  ('a2p-q1', 'module-a2plus', 'Consegue ler e escrever mensagens curtas?', '["Não","Com esforço","Sim"]', 2, 0),
  ('a2p-q2', 'module-a2plus', 'Consegue responder e-mails simples?', '["Não","Parcial","Sim"]', 2, 1),
  ('a2p-q3', 'module-a2plus', 'Consegue compreender textos curtos?', '["Não","Com ajuda","Sim"]', 2, 2),
  ('b1p-q1', 'module-b1plus', 'Consegue lidar com situações variadas com poucos deslizes?', '["Não","Às vezes","Sim"]', 2, 0),
  ('b1p-q2', 'module-b1plus', 'Consegue explicar problemas e soluções?', '["Não","Com ajuda","Sim"]', 2, 1),
  ('b1p-q3', 'module-b1plus', 'Consegue manter conversa espontânea?', '["Não","Parcial","Sim"]', 2, 2),
  ('b2p-q1', 'module-b2plus', 'Consegue argumentar temas complexos?', '["Não","Parcial","Sim"]', 2, 0),
  ('b2p-q2', 'module-b2plus', 'Consegue lidar com nuances culturais?', '["Não","Às vezes","Sim"]', 2, 1),
  ('b2p-q3', 'module-b2plus', 'Consegue compreender discussão técnica?', '["Não","Com ajuda","Sim"]', 2, 2),
  ('c1p-q1', 'module-c1plus', 'Consegue navegar temas abstratos com clareza?', '["Não","Parcial","Sim"]', 2, 0),
  ('c1p-q2', 'module-c1plus', 'Consegue tratar jargões técnicos?', '["Não","Com ajuda","Sim"]', 2, 1),
  ('c1p-q3', 'module-c1plus', 'Consegue revisar e sintetizar conteúdo técnico?', '["Não","Às vezes","Sim"]', 2, 2)
on conflict (id) do nothing;

insert into public.lessons (id, module_id, title, level, "order", duration_ms, video_path, caption_path, transcript) values
  ('lesson-a2p-1', 'module-a2plus', 'Mensagens curtas', 'A2+', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Como ler e escrever mensagens simples.'),
  ('lesson-a2p-2', 'module-a2plus', 'E-mails simples', 'A2+', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Respostas rápidas e clareza em e-mails.'),
  ('lesson-a2p-3', 'module-a2plus', 'Textos curtos', 'A2+', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Compreendendo textos curtos e diretos.'),
  ('lesson-b1p-1', 'module-b1plus', 'Situações variadas', 'B1+', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Como lidar com conversas inesperadas.'),
  ('lesson-b1p-2', 'module-b1plus', 'Problemas e soluções', 'B1+', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Explicar problemas e propor soluções.'),
  ('lesson-b1p-3', 'module-b1plus', 'Conversa espontânea', 'B1+', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Manter conversas com poucos deslizes.'),
  ('lesson-b2p-1', 'module-b2plus', 'Temas complexos', 'B2+', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Argumentando temas mais densos.'),
  ('lesson-b2p-2', 'module-b2plus', 'Nuances culturais', 'B2+', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Entendendo contexto e subtexto.'),
  ('lesson-b2p-3', 'module-b2plus', 'Discussão técnica', 'B2+', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Participando de discussões técnicas.'),
  ('lesson-c1p-1', 'module-c1plus', 'Temas abstratos', 'C1+', 0, 300000, 'aula2.mp4', 'aula2.srt', 'Lidando com conceitos abstratos.'),
  ('lesson-c1p-2', 'module-c1plus', 'Jargão técnico', 'C1+', 1, 300000, 'aula2.mp4', 'aula2.srt', 'Usando e entendendo jargões.'),
  ('lesson-c1p-3', 'module-c1plus', 'Síntese avançada', 'C1+', 2, 300000, 'aula2.mp4', 'aula2.srt', 'Resumindo conteúdo complexo.')
on conflict (id) do nothing;

insert into public.lesson_quizzes (id, lesson_id, question, options, correct, "order") values
  ('quiz-a2p-1-q1', 'lesson-a2p-1', 'Mensagem curta:', '["See you soon","Where is bus","I sleep"]', 0, 0),
  ('quiz-a2p-1-q2', 'lesson-a2p-1', 'Responder rápido:', '["Sure, I will do it","No talk","Silence"]', 0, 1),
  ('quiz-a2p-2-q1', 'lesson-a2p-2', 'E-mail simples:', '["Thanks for your email","Where is food","Stop"]', 0, 0),
  ('quiz-a2p-2-q2', 'lesson-a2p-2', 'Fechar e-mail:', '["Best regards","Bye bye","Later"]', 0, 1),
  ('quiz-a2p-3-q1', 'lesson-a2p-3', 'Texto curto:', '["Main idea first","Ignore context","Only emojis"]', 0, 0),
  ('quiz-a2p-3-q2', 'lesson-a2p-3', 'Compreensão:', '["The author says...","No idea","Skip"]', 0, 1),
  ('quiz-b1p-1-q1', 'lesson-b1p-1', 'Conversa inesperada:', '["Let me think...","I quit","Stop"]', 0, 0),
  ('quiz-b1p-1-q2', 'lesson-b1p-1', 'Fluidez:', '["Could you clarify?","Silence","Go away"]', 0, 1),
  ('quiz-b1p-2-q1', 'lesson-b1p-2', 'Descrever problema:', '["We have an issue with...","Where is bus","I am tired"]', 0, 0),
  ('quiz-b1p-2-q2', 'lesson-b1p-2', 'Propor solução:', '["Let''s try...","Forget it","Never mind"]', 0, 1),
  ('quiz-b1p-3-q1', 'lesson-b1p-3', 'Conversa espontânea:', '["That reminds me of...","Stop talking","I quit"]', 0, 0),
  ('quiz-b1p-3-q2', 'lesson-b1p-3', 'Poucos deslizes:', '["Let me rephrase","No speak","I go now"]', 0, 1),
  ('quiz-b2p-1-q1', 'lesson-b2p-1', 'Tema complexo:', '["Let''s break it down","Where is the bus","I am bored"]', 0, 0),
  ('quiz-b2p-1-q2', 'lesson-b2p-1', 'Argumento:', '["Consider also...","No idea","Stop"]', 0, 1),
  ('quiz-b2p-2-q1', 'lesson-b2p-2', 'Nuance cultural:', '["It depends on context","I am hungry","Wrong"]', 0, 0),
  ('quiz-b2p-2-q2', 'lesson-b2p-2', 'Subtexto:', '["Read between the lines","Ignore it","Skip"]', 0, 1),
  ('quiz-b2p-3-q1', 'lesson-b2p-3', 'Discussão técnica:', '["Let me summarize the issue","Where is coffee","I give up"]', 0, 0),
  ('quiz-b2p-3-q2', 'lesson-b2p-3', 'Termo técnico:', '["Throughput","Banana","Car"]', 0, 1),
  ('quiz-c1p-1-q1', 'lesson-c1p-1', 'Tema abstrato:', '["Let''s define the concept","Where is bus","No idea"]', 0, 0),
  ('quiz-c1p-1-q2', 'lesson-c1p-1', 'Exemplo abstrato:', '["For instance...","I am lost","Stop"]', 0, 1),
  ('quiz-c1p-2-q1', 'lesson-c1p-2', 'Jargão técnico:', '["It stands for...","I don''t know","Never mind"]', 0, 0),
  ('quiz-c1p-2-q2', 'lesson-c1p-2', 'Contextualizar termo:', '["In this context it means...","Who cares","Skip"]', 0, 1),
  ('quiz-c1p-3-q1', 'lesson-c1p-3', 'Síntese:', '["In summary...","No summary","Bye"]', 0, 0),
  ('quiz-c1p-3-q2', 'lesson-c1p-3', 'Reduzir complexidade:', '["The key point is...","I give up","I don''t care"]', 0, 1)
on conflict (id) do nothing;

alter table if exists public.initial_quiz_results add column if not exists user_name text;
alter table if exists public.user_lessons_completed add column if not exists user_name text;
alter table if exists public.user_lesson_quiz_results add column if not exists user_name text;
alter table if exists public.user_module_unlocks add column if not exists user_name text;

-- Backfill para colunas user_name (copiando de user_profiles)
update public.initial_quiz_results r
set user_name = p.name
from public.user_profiles p
where r.user_id = p.user_id and (r.user_name is null or r.user_name = '');

update public.user_lessons_completed r
set user_name = p.name
from public.user_profiles p
where r.user_id = p.user_id and (r.user_name is null or r.user_name = '');

update public.user_lesson_quiz_results r
set user_name = p.name
from public.user_profiles p
where r.user_id = p.user_id and (r.user_name is null or r.user_name = '');

update public.user_module_unlocks r
set user_name = p.name
from public.user_profiles p
where r.user_id = p.user_id and (r.user_name is null or r.user_name = '');
