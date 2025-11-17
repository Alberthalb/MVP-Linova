import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomButton from "../../components/CustomButton";
import { colors, spacing, typography } from "../../styles/theme";

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
    <View style={styles.container}>
      <Text style={styles.heading}>Quiz: {lessonTitle}</Text>
      <Text style={styles.progress}>
        Pergunta {step + 1} de {total}
      </Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    fontSize: typography.heading,
    fontWeight: "700",
    color: colors.primary,
  },
  progress: {
    color: colors.dark,
    fontSize: typography.body,
  },
  card: {
    backgroundColor: colors.light,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    flex: 1,
  },
  question: {
    fontSize: typography.subheading + 1,
    fontWeight: "600",
    color: colors.dark,
  },
  option: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.gray,
  },
  optionSelected: {
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: typography.body,
    color: colors.dark,
  },
  optionTextSelected: {
    color: colors.white,
    fontWeight: "700",
  },
});

export default LessonQuizScreen;