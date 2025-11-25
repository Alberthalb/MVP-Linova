# Linova - MVP de Aprendizado de Ingles

Aplicativo mobile construido com Expo + React Native para treinar ingles com aulas em video, legendas, transcricoes e quizzes. Este repositorio reune todas as telas do MVP (onboarding, login, trilha de aulas e area do aluno) e serve como vitrine no meu portfolio.

## Destaques
- Onboarding com quiz de nivelamento que recomenda onde o aluno deve iniciar.
- Player de video com legendas sincronizadas e transcricao completa da aula.
- Quiz por aula com persistencia local e em nuvem para acompanhar progresso.
- Tema claro/escuro e navegacao por abas com gesto de swipe personalizado.
- Integracao completa com Firebase (Auth, Firestore e Storage).

## Stack principal
- Expo 54 / React Native 0.81
- React Navigation 7 (stack + tabs)
- Firebase JS SDK 12 (Auth, Firestore, Storage)
- Expo AV, Expo SecureStore e AsyncStorage
- Google Fonts (Poppins, Inter, Manrope)

## Estrutura resumida
```
src/
  components/        # Botoes e UI compartilhada
  screens/           # Fluxos (Splash, Auth, Onboarding, Home, Lessons, Account, Settings)
  navigation/        # AppNavigator com deep linking
  services/          # firebase.js, authService, userService
  styles/            # Tema global (cores, tipografia, espacos)
  utils/             # Helpers (erros do Firebase, swipe state, display name)
```

## Como rodar
1. `npm install`
2. Copie `.env.example` para `.env` e preencha `EXPO_PUBLIC_FIREBASE_*` com os dados do seu projeto Firebase.
3. `npm start` para abrir o Expo Dev Tools. Use `npm run android`, `npm run ios` ou `npm run web` para destinos especificos.

O `app.config.js` le automaticamente o `.env` e injeta as credenciais em `expo.extra.firebase`, evitando versionar chaves sensiveis.

## Fluxo do produto
1. Splash + Welcome: decide entre onboarding ou area logada conforme o usuario.
2. Quiz de nivel: sugere um perfil (Discoverer ate Storyteller) e salva o resultado no Firestore.
3. Home: dashboard com boas-vindas, estatisticas e atalhos para a trilha.
4. Lista de aulas: consome `lessons` do Firestore em tempo real, com filtro por nivel e busca textual.
5. Aula: player com video do Storage, legendas `.vtt`, transcricao e botao para o quiz.
6. Quiz da aula: normaliza qualquer estrutura enviada pelo Firestore, salva progresso (SecureStore + Firestore) e mostra pontuacao final.
7. Conta e configuracoes: atualiza perfil, troca senha, exclui conta e alterna tema.

## Praticas de seguranca
- Apenas deep links confiaveis (dominios Linova ou scheme `linova`) podem abrir o fluxo de redefine-senha.
- Progresso do quiz e criptografado via `expo-secure-store` com fallback controlado para AsyncStorage.
- `npm audit` roda limpo e forca `glob` >= 10.5.0 via `overrides`.

## Roadmap pessoal
- Adicionar capturas das principais telas para enriquecer a apresentacao.
- Explorar gravacoes curtas demonstrando o player com legendas e o quiz.
- Disponibilizar um mock de dados para quem quiser testar sem Firebase.

## Contato
Este MVP nasceu para um projeto proprietario, mas estou aberto a feedbacks, reviews e parcerias. Abra uma issue ou me envie uma mensagem para conversar.
