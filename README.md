# MVP Linova

Aplicativo mobile (Expo + React Native) criado para entregar um MVP de aprendizagem de ingles com aulas em video, legendas, transcricoes e quizzes integrados ao Firebase. O projeto ja cobre todo o fluxo: onboarding, autenticacao, nivelamento inicial, consumo de aulas, quiz por aula, progresso local/cloud e gerenciamento de conta.

## Visao geral

- **Plataforma**: Expo SDK 54 (React Native 0.81) com suporte Android, iOS e web.
- **Backend-as-a-Service**: Firebase Auth, Firestore e Storage sao usados para usuarios, aulas, progresso e midias.
- **Estado global**: `AppContext` compartilha dados do usuario, tema claro/escuro e status de autenticacao.
- **UI/UX**: Design responsivo baseado no tema definido em `src/styles/theme.js`, com fontes Google carregadas em `App.js`.
- **Persistencia local**: AsyncStorage guarda progresso de quizzes por aula e serve como cache offline.

## Stack principal

- Expo (CLI + app.json) com plugin customizado `plugins/disableForceDark` para garantir consistencia do tema.
- React Navigation (stack + bottom tabs) com gesto de swipe personalizado entre abas (`useTabSwipeNavigation`).
- Firebase JS SDK v12 para Auth, Firestore e Storage.
- Lottie e Expo AV para animacoes e video streaming.
- AsyncStorage para dados locais.

## Requisitos e configuracao rapida

1. **Node** 18 LTS (ou 20) + **npm**.
2. **Expo CLI** (opcional): `npm install -g expo-cli`.
3. **Dependencias**: `npm install`.
4. **Variaveis de ambiente**:
   - Duplique `.env.example` para `.env`.
   - Preencha `EXPO_PUBLIC_FIREBASE_*` com os valores do seu projeto (essas variaveis sao injetadas no bundle por meio do `app.config.js`).
5. **Executar**:
   - `npm start` para abrir o Expo Dev Tools.
   - `npm run android` / `npm run ios` / `npm run web` conforme o simulador ou dispositivo.

> O arquivo `app.config.js` le automaticamente as variaveis definidas no `.env`/ambiente e preenche `expo.extra.firebase`, evitando expor credenciais no repositorio.

### Checklist de segredos

- `app.config.js`: usa apenas variaveis `EXPO_PUBLIC_FIREBASE_*`. Nao adicione valores reais diretamente.
- `.env`: ja esta no `.gitignore`; mantenha-o fora do versionamento.
- Procure chaves adicionais (`AIza`, `sk-`, URLs privadas) com `rg` antes de publicar um branch.

## Scripts npm

| Script | Descricao |
| --- | --- |
| `npm start` | Inicializa o bundler Expo. |
| `npm run android` | Executa o app no Android (emulador ou dispositivo). |
| `npm run ios` | Executa no simulador iOS (macOS). |
| `npm run web` | Abre a versao web do Expo. |

## Estrutura de pastas

```
src/
  assets/                # Imagens e ilustracoes especificas da UI
  components/
    CustomButton.js      # Botao padrao com variantes e estados de carregamento
  context/
    AppContext.js        # Estado global (usuario, tema, authReady)
  hooks/
    useThemeColors.js    # Seleciona paleta claro/escuro
    useTabSwipeNavigation.js
  navigation/
    AppNavigator.js      # Stack principal + tabs + linking
  screens/
    Auth/                # Login, registro, esqueci e reset de senha
    Onboarding/          # Welcome + quiz de nivel
    Splash/              # Splash animada
    Home/                # Dashboard do aluno
    Lessons/             # Lista de aulas, player e quiz
    Account/             # Perfil, resumo, exclusao
    Settings/            # Preferencias (tema)
  services/
    firebase.js          # Inicializacao do SDK
    authService.js       # Operacoes autenticacao/conta
    userService.js       # Firestore (perfil, quiz inicial, progresso)
  styles/
    theme.js             # Paleta, spacing, tipografia e raios
  utils/
    firebaseErrorMessage.js
    tabSwipeTransition.js
    userName.js
plugins/
  disableForceDark.js    # Config plugin que desativa forceDark no Android
App.js                   # Carrega fontes e injeta AppNavigator
```

## Arquitetura e fluxos

### Contexto global e tema
- `AppContext` guarda nivel atual, nome, email, modo escuro, usuario autenticado e `authReady`.
- `useThemeColors` e `useIsDarkMode` escolhem a paleta (light/dark) para estilos compartilhados.
- Fonts Google (Poppins, Inter, Manrope) sao carregadas em `App.js`; a UI soh eh exibida apos `useFonts` retornar `true`.

### Navegacao
- `AppNavigator` combina uma stack raiz (Splash, Welcome, Auth, Quiz, Tabs) com um bottom tab (`MainTabs`) composto por:
  - `TabHome`: stack das aulas (Home -> LessonList -> Lesson -> LessonQuiz).
  - `TabAccount`: stack Conta -> ChangePassword.
  - `TabSettings`: tela unica de configuracoes.
- Gestos horizontais controlados por `useTabSwipeNavigation` habilitam alternancia entre abas apenas quando a pilha da aba esta na raiz.
- Deep linking: `expo-linking` extrai `oobCode` dos links de redefinicao do Firebase para abrir direto `ResetPassword`.

### Fluxos principais

- **Splash e Welcome**: anima a marca e decide se envia o usuario para `MainTabs` (logado) ou `Welcome`.
- **Autenticacao** (`src/screens/Auth`):
  - `LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen` e `ResetPasswordScreen`.
  - `authService` encapsula login, cadastro, reset, troca de senha e exclusao de conta, reaproveitando `firebaseErrorMessage` para mensagens amigaveis.
- **Quiz de nivel (Onboarding)**:
  - `LevelQuizScreen` busca perguntas em `initialQuizQuestions`. Se Firestore nao possuir dados, usa `FALLBACK_QUESTIONS`.
  - Aplica uma media para sugerir nivel (Discoverer -> Storyteller), mas o app comeca em Discoverer ate termos logica adaptativa.
  - Salva respostas em `users/{uid}` (`initialQuizResult`) e tambem `initialQuiz...` no documento do usuario.
- **HomeScreen**:
  - Exibe boas-vindas com nome formatado (`getDisplayName`), estatisticas mockadas, botoes para aulas e um placeholder de IA (abre modal explicativo).
  - Possui toggle de tema (persistido no contexto) e modais com descricoes dos niveis/estatisticas.
- **Modulo de aulas**:
  - `LessonListScreen` escuta `lessons` via `onSnapshot`, ordenando pelo campo `order`. Filtra por nivel (auto seleciona o do usuario) e pesquisa por titulo.
  - `LessonScreen` consome um documento de `lessons` em tempo real e:
    - Carrega video (`lesson.videoPath`) e legendas (`lesson.captionPath`) do Firebase Storage via `getDownloadURL`.
    - Converte legendas WEBVTT para segmentos com `parseSubtitleFile` e sincroniza exibicao no player do Expo AV.
    - Mostra transcricao (`lesson.transcript`) e o botao "Fazer quiz" que encaminha `lessonId` e `lessonTitle`.
- **Quiz da aula**:
  - `LessonQuizScreen` normaliza qualquer estrutura recebida em `lesson.quiz` (array ou objeto).
  - Helpers `toPlainText`, `collectOptionValues` e `normalizeOptions` garantem que cada alternativa vire texto simples antes de renderizar (evitando o erro de objetos no React).
  - Respostas sao guardadas em `answers`, calculando acertos ao final.
  - Persistencia:
    - Local: AsyncStorage (`@linova:lessonProgress`) para saber se a aula foi concluida e qual nota o aluno teve.
    - Remota: `saveLessonProgress` cria/atualiza `users/{uid}/lessonsCompleted/{lessonId}` com score, acertos e respostas.
- **Conta e configuracoes**:
  - `AccountScreen` permite atualizar nome/email (com `verifyBeforeUpdateEmail` quando alterado), visualizar resumo mockado e solicitar exclusao total da conta (remove perfil + colecoes auxiliares via `deleteAllUserData`).
  - `SettingsScreen` apresenta o toggle global de tema, sincronizado com o contexto.
  - `ChangePasswordScreen` reaproveita `authService.changePassword` (reautenticacao antes de definir nova senha).

## Firebase e modelo de dados

### Variaveis de ambiente (Firebase)

- Expo exige o prefixo `EXPO_PUBLIC_` para disponibilizar variaveis no bundle. Utilize:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

- `app.config.js` carrega esses valores no momento do build e injeta em `extra.firebase`. No runtime, `src/services/firebase.js` continua usando `Constants.expoConfig.extra.firebase`.

### Configuracao
- Valores do SDK sao lidos de `expo.extra.firebase`. Em producao, considere mover para variaveis de ambiente usando `app.config.js`.
- `firebase.js` inicializa o app uma unica vez (usando `getApps()`), exportando `auth`, `db` e `storage`.

### Estrutura recomendada

```text
lessons (colecao)
  {lessonId} {
    title: string,
    level: "Discoverer" | "Pathfinder" | ...,
    order: number,
    duration: string|number,
    videoPath: "videos/lesson01.mp4",
    captionPath: "captions/lesson01.vtt",
    transcript: string,
    quiz: [
      {
        id: "q1",
        question: "Pergunta ...",
        options: ["Opcao A", "Opcao B", "Opcao C"],
        correct: 0 // indice baseado em 0
      }
    ]
  }

users (colecao)
  {uid} {
    name, email, level, initialQuizSuggestedLevel, ...
  }
  {uid}/initialQuiz/result { answers, score, suggestedLevel, ... }
  {uid}/lessonsCompleted/{lessonId} { score, answers, totalQuestions, updatedAt }

initialQuizQuestions (colecao)
  {doc} {
    question,
    options: [{ text, value }],
    correct,
    order
  }
```

- **Arquivos no Storage**:
  - `lesson.videoPath` e `lesson.captionPath` devem apontar para objetos existentes para que o player e as legendas funcionem.
  - Qualquer formato VTT padrao e suportado; o parser remove `WEBVTT` e converte timestamps para millisegundos.
- **Quiz flexivel**: mesmo se o campo `quiz` vier como objeto (`{0: {...}, 1: {...}}`) ou se `options` for mapa (`{A: "Texto"}`), o normalizador converte para arrays legiveis.

## Servicos e utilitarios

- `authService.js`: abstrai todas as chamadas do Firebase Auth (register, login, logout, change password, delete account, verify email update). Tambem garante sincronizacao com `userService.createOrUpdateUserProfile`.
- `userService.js`: funcoes para CRUD de perfil, quiz inicial e progresso de aulas. Inclui helpers para limpar colecoes ao excluir conta.
- `firebaseErrorMessage.js`: tabela simples que converte `error.code` do Firebase em mensagens em portugues.
- `tabSwipeTransition.js`: guarda deslocamentos entre abas para animacoes consistentes durante o swipe.
- `userName.js`: gera um display name amigavel baseado no nome completo ou email.

## Seguranca do Firebase

### Regras Firestore sugeridas

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lessons/{lessonId} {
      allow read: if request.auth != null;
      allow write: if false; // apenas administradores via SDK/CI
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /initialQuizQuestions/{docId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

- Ajuste conforme sua estrategia (por exemplo, colecao `lessons` administrada por Cloud Functions).

### Regras Storage sugeridas

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /lessons/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- Certifique-se de que uploads de aulas sejam feitos apenas via pipeline autenticada (CLI/Admin SDK), mantendo `allow write: if false` para usuarios comuns.

- Sempre teste regras com o simulador do Firebase console antes de publicar.

## Estilos e UI

- `src/styles/theme.js` define cores claras/escuras, spacing, tipografia e raios de borda. Todos os componentes usam essas constantes para manter consistencia.
- `CustomButton` oferece variante primaria (fundo `colors.accent`) e ghost (transparente) com estados de carregamento via `ActivityIndicator`.
- `plugins/disableForceDark.js` garante que o Android nao force tema escuro automaticamente, preservando o controle manual do app.

## Persistencia local e sincronizacao

- **AsyncStorage** (`LessonQuizScreen`): guarda progresso das aulas offline e evita repetir quizzes concluido.
- **AppContext**: mantem dados do usuario logado e evita buscar Firestore desnecessariamente para exibicao rapida de nome/tema.
- **Realtime listeners** (`onSnapshot`):
  - `LessonScreen` e `LessonListScreen` reagem a alteracoes no Firestore em tempo real.

## Boas praticas para evoluir

1. **Validacao de dados no Firestore**: use Regras de seguranca para garantir que `lessons` sempre tenham `title`, `level`, `order` e um `quiz` com perguntas validas.
2. **Upload de aulas**: padronize nomes dos arquivos no Storage (`videos/lesson-{order}.mp4`, `captions/lesson-{order}.vtt`) para facilitar manutencao.
3. **Analytics**: considere adicionar Expo Analytics ou Firebase Analytics para acompanhar desempenho do MVP.
4. **Testes**: componentes chave (LessonQuiz, auth screens) podem ganhar testes unitarios com Jest/React Native Testing Library quando o escopo aumentar.

Com este README voce tem a fotografia atual do MVP, os passos para rodar localmente, o modelo de dados esperado e os pontos essenciais para continuar a evolucao da plataforma Linova.

