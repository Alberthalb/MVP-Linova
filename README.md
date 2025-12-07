# Linova — App Mobile de Inglês

Aplicativo Expo/React Native com aulas em vídeo, legendas, transcrição e quizzes, usando Supabase (Auth + Postgres/Realtime).

---

## Pitch rápido
- Problema: alunos iniciantes não sabem o que estudar e perdem foco.
- Solução: onboarding com quiz de nível, trilha guiada de aulas, player com legendas e quiz por aula que libera progresso e promoção de nível.
- Resultado: fluxo completo (onboarding → aula → quiz → conta) pronto para demos e validação.

---

## Principais features
- Quiz de nivelamento (A1–C2) que sugere nível inicial.
- Player de vídeo com troca de qualidade, legendas `.vtt`, transcrição e fullscreen custom.
- Timeline interativa com seek por gesto e controles que se ocultam automaticamente.
- Gate por nível e por aula: só libera quiz após assistir; promoção automática com nota ≥70%.
- Lista de módulos/aulas com bloqueio por XP ou prova de capacidade.
- Conta/segurança: atualização de perfil, troca de senha, logout e exclusão completa via Edge Function.
- Tema claro/escuro e swipe entre tabs.

---

## Stack
| Camada | Tecnologias |
| --- | --- |
| Mobile | Expo SDK 54, React Native 0.81, React 19 |
| Navegação | React Navigation 7 (stack + bottom tabs) + gesto custom |
| Backend | Supabase (Auth, Postgres, Realtime) |
| Mídia | `expo-av` (player), legendas WEBVTT, fullscreen custom |
| Segurança/armazenamento | SecureStore (fallback AsyncStorage) para progresso local |
| UI | Google Fonts (Poppins/Inter/Manrope), Feather Icons, tema em `src/styles/theme.js` |

---

## Estrutura (essencial para leitura de código)
```
App.js                        # Entrada Expo e carregamento de fonts
app.config.js                 # Config dinâmica e injeção de .env
src/navigation/AppNavigator.js   # Stacks, tabs, deep linking seguro
src/context/AppContext.js        # Estado global (auth, progresso, tema, módulos)
src/screens/Lessons/LessonListScreen.js  # Lista de aulas por módulo
src/screens/Lessons/LessonScreen.js      # Player, legendas, timeline, fullscreen
src/screens/Lessons/LessonQuizScreen.js  # Quiz da aula e promoção de nível
src/screens/Lessons/ModuleListScreen.js  # Seleção/desbloqueio de módulos
src/services/authService.js      # Fluxos de login/reset/alteração/exclusão
src/services/userService.js      # Perfil, progresso, quiz inicial
src/styles/theme.js              # Paleta, tipografia, spacing
```

---

## Como rodar localmente
1. `npm install`
2. Copie `.env` (veja o exemplo) e preencha `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` com seu projeto Supabase (e, se usar Storage, defina `EXPO_PUBLIC_SUPABASE_BUCKET`). Nunca commite chaves reais.
3. `npm start` (Expo Dev Tools) ou `npm run android` / `npm run ios`.
4. Faça login/cadastro e percorra: quiz de nível → lista de aulas → player (fullscreen + legendas) → quiz → promoção de nível.

---

## Pontos de atenção técnicos
- Um único `Video` controla retrato/fullscreen; timeline com `PanResponder` para seek preciso.
- Legendas usam overlay próprio + `textTracks`; exibem apenas quando os controles somem.
- Barra de navegação Android escondida em fullscreen (`immersiveSticky`), rotação travada em landscape no modo expandido.
- Progresso de quiz salvo no Supabase; `lessonsCompleted` alimenta dashboard e gating.
- Dados do usuário e aulas usam consultas e canais em tempo real Supabase.

---

## Créditos
Projeto desenvolvido para validação da metodologia Linova e apresentado como peça de portfólio técnico.
