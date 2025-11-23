import React, { useContext, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "../../hooks/useThemeColors";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { AppContext } from "../../context/AppContext";
import { saveLessonProgress } from "../../services/userService";

const STORAGE_KEY = "@linova:lessonProgress";

const normalizeOptions = (options) => {
  if (Array.isArray(options)) return options;
  if (options && typeof options === "object") {
    return Object.keys(options)
      .sort()
      .map((key) => options[key])
      .map((value) => {
        if (typeof value === "string") return value;
        if (typeof value === "number") return String(value);
        if (value && typeof value === "object") {
          if (typeof value.text === "string") return value.text;
          const nested = Object.values(value).find((entry) => typeof entry === "string");
          if (nested) return nested;
        }
        return "";
      })
      .filter((value) => !!value);
  }
  return [];
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
    const rawOptions = item.options ?? item.Options ?? [];
    return {
      id: item.id ?? index + 1,
      question: item.question || "",
      options: normalizeOptions(rawOptions),
      correct: item.correct ?? 0,
    };
  });
};

const LessonQuizScreen = ({ navigation, route }) => {
  const lessonId = route?.params?.lessonId ?? 0;
  const lessonTitle = route?.params?.lessonTitle ?? "Aula";
  const { currentUser } = useContext(AppContext);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const total = questions.length;
  const currentQuestion = useMemo(() => questions[step], [step, questions]);
  const progress = total > 0 ? (step + 1) / total : 0;
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const selectOption = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  useEffect(() => {
    if (!lessonId) {
      setLoading(false);
      return;
    }
    const docRef = doc(db, "lessons", lessonId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        const data = snapshot.data();
        const quizData = normalizeQuiz(data?.quiz || []);
        setQuestions(quizData);
        setStep(0);
        setAnswers({});
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [lessonId]);

  const goNext = async () => {
    if (!currentQuestion) {
      Alert.alert("Quiz indisponível", "Esta aula ainda não possui perguntas.");
      return;
    }
    if (answers[currentQuestion.id] === undefined) {
      Alert.alert("Responda a pergunta", "Selecione uma alternativa antes de avancar.");
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
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = {
        ...parsed,
        [lessonId]: { score, completed: true, lessonTitle },
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (currentUser?.uid) {
        await saveLessonProgress(currentUser.uid, lessonId, {
          lessonTitle,
          score,
          correctAnswers,
          totalQuestions: total,
          answers,
        });
      }
      Alert.alert("Progresso salvo", `Voce acertou ${correctAnswers}/${total} (${score}%).`, [
        { text: "Ok", onPress: () => navigation.navigate("LessonList") },
      ]);
    } catch (error) {
      Alert.alert("Erro ao salvar", "Nao foi possivel salvar seu progresso local.");
    }
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
          <Text style={styles.empty}>Esta aula ainda não possui quiz.</Text>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.question}>{currentQuestion?.question}</Text>
              {currentQuestion?.options?.map((option, index) => {
                const selected = answers[currentQuestion.id] === index;
                return (
                  <TouchableOpacity
                    key={`${currentQuestion.id}-${option}`}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => selectOption(index)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <CustomButton title={step === total - 1 ? "Finalizar" : "Proxima"} onPress={goNext} />
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
