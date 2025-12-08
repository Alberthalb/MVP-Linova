import React, { useContext, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "../../hooks/useThemeColors";
import { supabase } from "../../services/supabase";
import { AppContext } from "../../context/AppContext";
import { createOrUpdateUserProfile, saveLessonProgress, saveLessonQuizResult } from "../../services/userService";
import { LEVEL_SEQUENCE, getNextLevel, canAccessLevel } from "../../utils/levels";

const STORAGE_KEY = "@linova:lessonProgress";

const sanitizeKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, "-");
const getProgressKey = (uid) => sanitizeKey(uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY);

const readProgressFromStorage = async (key) => {
  try {
    const secured = await SecureStore.getItemAsync(key);
    if (secured) return JSON.parse(secured);
  } catch (error) {
    console.warn("[LessonQuiz] Falha ao ler SecureStore:", error);
  }
  try {
    const fallback = await AsyncStorage.getItem(key);
    return fallback ? JSON.parse(fallback) : {};
  } catch (error) {
    console.warn("[LessonQuiz] Falha ao ler AsyncStorage:", error);
  }
  return {};
};

const writeProgressToStorage = async (key, value) => {
  const serialized = JSON.stringify(value);
  try {
    await SecureStore.setItemAsync(key, serialized, {
      keychainService: key,
    });
    return;
  } catch (error) {
    console.warn("[LessonQuiz] Falha ao gravar SecureStore, usando AsyncStorage:", error);
  }
  await AsyncStorage.setItem(key, serialized);
};

const toPlainText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((entry) => toPlainText(entry)).filter(Boolean).join(" ").trim();
  }
  if (typeof value === "object") {
    const candidates = ["text", "label", "value", "title", "name"];
    for (const candidate of candidates) {
      if (value[candidate] !== undefined) {
        const normalized = toPlainText(value[candidate]);
        if (normalized) return normalized;
      }
    }
    const nested = Object.keys(value)
      .sort()
      .map((key) => toPlainText(value[key]))
      .filter(Boolean);
    return nested.join(" ").trim();
  }
  return "";
};

const collectOptionValues = (input) => {
  if (input === null || input === undefined) return [];
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
    const normalized = toPlainText(input);
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(input)) {
    return input.flatMap((entry) => collectOptionValues(entry));
  }
  if (typeof input === "object") {
    const displayKeys = ["text", "label", "value", "title", "name", "option", "optionText"];
    for (const key of displayKeys) {
      const candidate = input[key];
      if (candidate === undefined) continue;
      const isPrimitive =
        typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean";
      if (isPrimitive) {
        const normalized = toPlainText(candidate);
        if (normalized) return [normalized];
      }
    }
    const nestedFromDisplay = displayKeys
      .filter((key) => input[key] !== undefined)
      .flatMap((key) => collectOptionValues(input[key]));
    if (nestedFromDisplay.length) return nestedFromDisplay;
    const keys = Object.keys(input).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return keys.flatMap((key) => collectOptionValues(input[key]));
  }
  return [];
};

const normalizeOptions = (options) => {
  const collected = collectOptionValues(options);
  return collected.filter((value, index) => value.length > 0 && collected.indexOf(value) === index);
};

const parseCorrectIndex = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) return asNumber;
    if (trimmed.length === 1) {
      const code = trimmed.toUpperCase().charCodeAt(0) - 65;
      if (code >= 0 && code < 26) return code;
    }
  }
  return 0;
};

const clampCorrectIndex = (value, totalOptions) => {
  const parsed = parseCorrectIndex(value);
  if (!Number.isFinite(parsed)) return 0;
  if (!totalOptions || totalOptions <= 1) return 0;
  return Math.min(Math.max(parsed, 0), totalOptions - 1);
};

const normalizeQuiz = (quizData) => {
  let items = [];
  if (Array.isArray(quizData)) {
    items = quizData;
  } else if (quizData && typeof quizData === "object") {
    items = Object.keys(quizData)
      .sort()
      .map((key) => quizData[key]);
  }
  return items.map((item, index) => {
    const rawOptions = item?.options ?? item?.Options ?? [];
    const options = normalizeOptions(rawOptions);
    return {
      id: String(item?.id ?? item?._id ?? index + 1),
      question: toPlainText(item?.question ?? item?.Question) || `Pergunta ${index + 1}`,
      options,
      correct: clampCorrectIndex(item?.correct ?? item?.Correct ?? 0, options.length),
    };
  });
};

const LessonQuizScreen = ({ navigation, route }) => {
  const lessonId = route?.params?.lessonId ?? 0;
  const lessonTitle = route?.params?.lessonTitle ?? "Aula";
  const { currentUser, level, setLevel, setLessonsCompleted, setProgressStats } = useContext(AppContext);
  const [lessonLevel, setLessonLevel] = useState(route?.params?.lessonLevel || null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const total = questions.length;
  const currentQuestion = useMemo(() => questions[step], [step, questions]);
  const progress = total > 0 ? (step + 1) / total : 0;
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const storageKey = useMemo(() => getProgressKey(currentUser?.id), [currentUser?.id]);

  const selectOption = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const promoteIfEligible = async () => {
    if (!currentUser?.id || !level) return null;
    const nextLevel = getNextLevel(level);
    if (!nextLevel) return null;
    try {
      const { data: lessonsData, error: lessonsError } = await supabase.from("lessons").select("id,level").eq("level", level);
      if (lessonsError) throw lessonsError;
      const lessonIds = (lessonsData || []).map((row) => row.id);
      if (!lessonIds.length) return null;
      const { data: progressData, error: progressError } = await supabase
        .from("user_lessons_completed")
        .select("lesson_id,score")
        .eq("user_id", currentUser.id)
        .in("lesson_id", lessonIds);
      if (progressError) throw progressError;
      const progressMap = new Map(progressData.map((row) => [row.lesson_id, row]));
      const completedAll = lessonIds.every((id) => {
        const entry = progressMap.get(id);
        const score = typeof entry?.score === "number" ? entry.score : Number(entry?.score) || 0;
        return score >= 70;
      });
      if (!completedAll) return null;
      await createOrUpdateUserProfile(currentUser.id, { level: nextLevel });
      setLevel(nextLevel);
      return nextLevel;
    } catch (error) {
      console.warn("[Lesson] Falha ao avaliar promocao:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!lessonId) {
      setLoading(false);
      return;
    }
    const fetchQuiz = async () => {
      try {
        const { data: lessonData, error: lessonError } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
        if (lessonError) throw lessonError;
        if (lessonData?.level && lessonData.level !== lessonLevel) {
          setLessonLevel(lessonData.level);
        }
        const { data: quizData, error: quizError } = await supabase
          .from("lesson_quizzes")
          .select("*")
          .eq("lesson_id", lessonId)
          .order("order", { ascending: true });
        if (quizError) throw quizError;
        const normalized = quizData && quizData.length ? normalizeQuiz(quizData) : normalizeQuiz(lessonData?.quiz || []);
        setQuestions(normalized);
        setStep(0);
        setAnswers({});
      } catch (error) {
        console.warn("[LessonQuiz] Falha ao carregar quiz:", error);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [lessonId, lessonLevel]);

  useEffect(() => {
    if (accessDenied) return;
    if (!level || !lessonLevel) return;
    if (canAccessLevel(level, lessonLevel)) return;
    setAccessDenied(true);
    Alert.alert(
      "Quiz bloqueado",
      `Este quiz pertence ao nÃ­vel ${lessonLevel}. Complete seu nÃ­vel atual (${level}) para desbloquear.`,
      [{ text: "Ok", onPress: () => navigation.goBack() }]
    );
  }, [accessDenied, lessonLevel, level, navigation]);

  const goNext = async () => {
    if (!currentQuestion) {
      Alert.alert("Quiz indisponÃ­vel", "Esta aula ainda nÃ£o possui perguntas.");
      return;
    }
    if (answers[currentQuestion.id] === undefined) {
      Alert.alert("Responda Ã  pergunta", "Selecione uma alternativa antes de avanÃ§ar.");
      return;
    }
    if (step < total - 1) {
      setStep((prev) => prev + 1);
    } else {
      await finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const correctAnswers = questions.filter((q) => answers[q.id] === q.correct).length;
    const score = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
    const passed = score >= 70;
    const xpEarned = passed ? 10 : 0;

    // salva local
    try {
      const parsed = await readProgressFromStorage(storageKey);
      const updated = {
        ...parsed,
        [lessonId]: { score, completed: passed, lessonTitle },
      };
      await writeProgressToStorage(storageKey, updated);
    } catch (error) {
      Alert.alert("Erro ao salvar", "Não foi possível salvar seu progresso local.");
      return;
    }

    // salva remoto e propaga erros (para garantir conclusao e XP)
    if (currentUser?.id) {
      try {
        await saveLessonProgress(currentUser.id, lessonId, {
          lessonTitle,
          score,
          answers,
          completed: passed,
          watched: true,
          xp: xpEarned,
        });
      } catch (err) {
        console.warn("[LessonQuiz] Falha ao salvar progresso Supabase:", err);
        Alert.alert("Erro ao salvar", "Não foi possível salvar seu progresso no servidor. Tente novamente.");
        return;
      }

      try {
        await saveLessonQuizResult(currentUser.id, lessonId, {
          score,
          correctAnswers,
          totalQuestions: total,
          passed,
          answers,
        });
      } catch (err) {
        console.warn("[LessonQuiz] Falha ao salvar resultado detalhado:", err);
        // segue mesmo se o detalhado falhar
      }
    }

    // atualiza contexto imediatamente (realtime pode demorar)
    if (setLessonsCompleted) {
      const nowIso = new Date().toISOString();
      setLessonsCompleted((prev) => ({
        ...prev,
        [lessonId]: {
          ...(prev?.[lessonId] || {}),
          lesson_id: lessonId,
          lesson_title: lessonTitle,
          score,
          completed: passed,
          watched: true,
          xp: xpEarned,
          updated_at: nowIso,
        },
      }));
    }
    if (setProgressStats) {
      // resumo local simples: conta apenas conclusoes
      setProgressStats((prev) => {
        const prevLessons = Number.isFinite(prev?.lessons) ? prev.lessons : 0;
        const prevActivities = Number.isFinite(prev?.activities) ? prev.activities : 0;
        const prevXp = Number.isFinite(prev?.xp) ? prev.xp : 0;
        if (!passed) return prev || { days: 0, lessons: 0, activities: 0, xp: 0 };
        return { ...prev, lessons: prevLessons + 1, activities: prevActivities + 1, xp: prevXp + xpEarned };
      });
    }

    const goToLessonsRoot = () =>
      navigation.reset({
        index: 1,
        routes: [{ name: "Home" }, { name: "LessonList" }],
      });

    if (!passed) {
      Alert.alert(
        "Continue praticando",
        `Você acertou ${correctAnswers}/${total} (${score}%). Tente novamente para alcançar 70% e liberar a conclusão.`,
        [{ text: "Ok", onPress: goToLessonsRoot }]
      );
      return;
    }

    let promotedLevel = null;
    if (currentUser?.id) {
      promotedLevel = await promoteIfEligible();
    }
    const title = promotedLevel ? "Parabéns!" : "Progresso salvo";
    const message = promotedLevel
      ? `Você acertou ${correctAnswers}/${total} (${score}%) e avançou para o nível ${promotedLevel}!`
      : `Você acertou ${correctAnswers}/${total} (${score}%).`;
    Alert.alert(title, message, [{ text: "Ok", onPress: goToLessonsRoot }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={theme.primary} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <View style={styles.hero}>
          <Text style={styles.heading}>Quiz: {lessonTitle}</Text>
          <Text style={styles.progress}>
            Pergunta {Math.min(step + 1, Math.max(total, 1))} de {Math.max(total, 1)}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.progress}>Carregando perguntas...</Text>
          </View>
        ) : total === 0 ? (
          <Text style={styles.empty}>Esta aula ainda nÃ£o possui quiz.</Text>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.question}>{currentQuestion?.question}</Text>
              {currentQuestion?.options?.map((option, index) => {
                const selected = answers[currentQuestion.id] === index;
                return (
                  <TouchableOpacity
                    key={`${currentQuestion.id}-${index}`}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => selectOption(index)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <CustomButton title={step === total - 1 ? "Finalizar" : "PrÃ³xima"} onPress={goNext} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.layout,
      paddingBottom: spacing.layout,
      paddingTop: spacing.md,
      gap: spacing.md,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    backButtonText: {
      color: colors.primary,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
    hero: {
      gap: spacing.xs,
    },
    heading: {
      fontSize: typography.heading,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: typography.fonts.heading,
    },
    progress: {
      color: colors.muted,
      fontSize: typography.body,
      fontFamily: typography.fonts.body,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.md,
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
    },
    question: {
      fontSize: typography.subheading + 1,
      fontWeight: "600",
      color: colors.text,
      fontFamily: typography.fonts.heading,
    },
    option: {
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.gray,
    },
    optionSelected: {
      backgroundColor: colors.primary,
    },
    optionText: {
      fontSize: typography.body,
      color: colors.text,
      fontFamily: typography.fonts.body,
    },
    optionTextSelected: {
      color: colors.background,
      fontWeight: "700",
      fontFamily: typography.fonts.heading,
    },
    progressBar: {
      height: 10,
      backgroundColor: colors.gray,
      borderRadius: radius.md,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
    },
    loader: {
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    empty: {
      textAlign: "center",
      color: colors.muted,
      fontFamily: typography.fonts.body,
    },
  });

export default LessonQuizScreen;

