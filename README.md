# Linova - app mobile de ingles

Experiencia mobile criada para validar a metodologia Linova: trilhas de aulas em video, legendas sincronizadas, transcricoes e quizzes que promovem o aluno quando domina o nivel. Tudo foi desenvolvido em Expo + React Native consumindo Firebase (Auth, Firestore e Storage).

## Pitch
- Problema: estudantes iniciantes pulam de conteudo em conteudo sem saber onde focar.
- Solucao: app de estudo guiado que aplica um quiz de nivelamento, destrava apenas o que faz sentido e coleta dados em tempo real.
- Resultado: fluxo completo de onboarding -> aula -> quiz -> area logada pronto para demos, investors e portfolio.

## Highlights do produto
- Onboarding gamificado com quiz que sugere o nivel inicial e grava respostas no Firestore.
- Player de video com troca de qualidade, legendas `.vtt` e transcricao rolavel.
- Quiz por aula com normalizacao das perguntas (aceita objetos/dicionarios no Firestore), nota local criptografada (SecureStore) + sincronizacao em nuvem.
- Gate por nivel: so acessa aulas/quiz do nivel atual e sobe automaticamente ao completar todas com nota >=70%.
- Dashboard Home com estatisticas (dias ativos, aulas, atividades) calculadas em tempo real.
- Area da conta com atualizacao de perfil, resumo, troca de senha, logout e exclusao completa.
- Tema claro/escuro controlado pelo app (override forceDark no Android) e navegacao com swipe entre tabs.

## Stack principal
| Camada | Tecnologias |
| --- | --- |
| Mobile | Expo SDK 54, React Native 0.81, React 19 |
| Navegacao | React Navigation 7 (stack + bottom tabs) + gesto custom `useTabSwipeNavigation` |
| Backend | Firebase Auth, Firestore, Storage (SDK 12) |
| UX e utilitarios | Expo AV, Expo SecureStore, AsyncStorage, Expo Linking, Feather Icons, Google Fonts (Poppins/Inter/Manrope) |
| Config | `app.config.js` com `dotenv`, plugin `plugins/disableForceDark`, EAS Build/Updates |

## Arquitetura em um olhar
```
App.js
|- AppNavigator (stack + tabs + deep linking seguro)
|  |- Splash / Welcome / Auth / Quiz de nivel
|  |- MainTabs
|     |- HomeStack (Home -> LessonList -> Lesson -> LessonQuiz)
|     |- AccountStack (Account -> ChangePassword)
|     |- Settings
```
- `src/context/AppContext` centraliza usuario, nivel, tema e progresso (listeners em tempo real).
- `LessonScreen` consome aulas do Firestore, baixa midias do Storage e salva `watched`.
- `LessonQuizScreen` normaliza perguntas, calcula nota local/cloud e promove nivel conforme `LEVEL_SEQUENCE`.
- `plugins/disableForceDark` garante visual consistente mesmo quando o sistema tenta forcar dark mode.

## Experiencia do usuario
1. Splash + Welcome verificam autenticacao e enviam para onboarding ou area logada.
2. Quiz de nivel calcula media das respostas, registra sugestao de nivel e inicia em Discoverer.
3. Home mostra saudacao, estatisticas e atalhos (incluindo placeholder de IA Coach).
4. Lista de aulas busca `lessons` do Firestore, filtra por nivel, inclui busca textual e indicador de conclusao.
5. Player combina video do Storage, legendas `.vtt`, transcricao completa e so libera o quiz apos assistir.
6. Quiz mostra progresso, nota final e sincroniza resultados (>=70% marca aula como concluida e alimenta promocao de nivel).
7. Conta + Settings liberam alteracao de perfil, resumo, troca de senha, logout e toggle de tema.

## Como rodar localmente
1. `npm install`
2. Copie `.env.example` para `.env` e preencha `EXPO_PUBLIC_FIREBASE_*` com as chaves do seu projeto.
3. `npm start` para abrir o Expo Dev Tools. Use `npm run android`, `npm run ios` ou `npm run web` conforme o destino.

> `app.config.js` le o `.env` e injeta as credenciais em `expo.extra.firebase`, mantendo o repositorio livre de secrets.

## Boas praticas implementadas
- Deep linking seguro: apenas hosts Linova `app-linova.firebaseapp.com`/`app-linova.web.app` ou scheme `linova://` abrem o fluxo de reset.
- Progresso do quiz criptografado com SecureStore (fallback controlado para AsyncStorage).
- Override `npm overrides.glob` evita vulnerabilidade conhecida.
- Estrutura de dados previsivel (`lessons`, `users`, `lessonsCompleted`, `initialQuizQuestions`) e helpers para normalizar conteudo irregular do Firestore.

## Roadmap curto
- Adicionar capturas de tela e um video demo a este README.
- Publicar um mock/seed do Firestore para quem quiser testar sem back-end real.
- Instrumentar analytics (Firebase ou Segment) e experimentar IA Coach (placeholder ja existe no app).

## Quer explorar mais?
- Arquitetura completa, modelos e rotinas operacionais estao documentados em `README.internal.md`.
- Estrutura principal: `src/components`, `src/screens`, `src/services`, `src/utils`, `src/styles`.
- Fique a vontade para abrir uma issue ou conversar se quiser ver o Linova em funcionamento ao vivo.
