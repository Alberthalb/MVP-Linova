import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "../../hooks/useThemeColors";

const QUESTIONS = [
  {
    id: 1,
    question: "Como dizer ola de forma informal?",
    options: ["Hey there!", "Good bye!", "See you yesterday"],
    correct: 0,
  },
  {
    id: 2,
    question: "Qual expressao indica rotina diaria?",
    options: ["I brush my teeth every morning.", "I brushed my teeth tomorrow.", "I will brush my teeth yesterday."],
    correct: 0,
  },
  {
    id: 3,
    question: "Escolha a frase gramaticalmente correta:",
    options: ["She don't like apples.", "She doesn't like apples.", "She not like apples."],
    correct: 1,
  },
];

const STORAGE_KEY = "@linova:lessonProgress";

const LessonQuizScreen = ({ navigation, route }) => {
  const lessonId = route?.params?.lessonId ?? 0;
  const lessonTitle = route?.params?.lessonTitle ?? "Aula";
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const total = QUESTIONS.length;
  const currentQuestion = useMemo(() => QUESTIONS[step], [step]);
  const progress = (step + 1) / total;
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const selectOption = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const goNext = async () => {
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
    const correctAnswers = QUESTIONS.filter((q) => answers[q.id] === q.correct).length;
    const score = Math.round((correctAnswers / total) * 100);
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = {
        ...parsed,
        [lessonId]: { score, completed: true, lessonTitle },
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
            Pergunta {step + 1} de {total}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.card}>
          <Text style={styles.question}>{currentQuestion.question}</Text>
          {currentQuestion.options.map((option, index) => {
            const selected = answers[currentQuestion.id] === index;
            return (
              <TouchableOpacity
                key={option}
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
  });

export default LessonQuizScreen;
