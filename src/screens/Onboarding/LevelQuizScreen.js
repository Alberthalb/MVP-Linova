import React, { useContext, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../context/AppContext";
import { spacing, typography, radius } from "../../styles/theme";
import { getDisplayName } from "../../utils/userName";
import { useThemeColors } from "../../hooks/useThemeColors";

const QUESTIONS = [
  {
    id: 1,
    question: "Voce entende saudacoes e frases simples?",
    options: [
      { text: "Ainda estou comecando", value: 1 },
      { text: "Consigo entender bem", value: 2 },
      { text: "Tranquilo, e facil", value: 3 },
    ],
  },
  {
    id: 2,
    question: "Como voce lida com textos curtos em ingles?",
    options: [
      { text: "Preciso traduzir tudo", value: 1 },
      { text: "Leio com alguma ajuda", value: 2 },
      { text: "Leitura fluida", value: 3 },
    ],
  },
  {
    id: 3,
    question: "Consegue conversar informalmente?",
    options: [
      { text: "Ainda nao", value: 1 },
      { text: "Com pausas, mas rola", value: 2 },
      { text: "Consigo me expressar bem", value: 3 },
    ],
  },
  {
    id: 4,
    question: "Gramatica avancada e...",
    options: [
      { text: "Um misterio", value: 1 },
      { text: "Algo que estou estudando", value: 2 },
      { text: "Confortavel", value: 3 },
    ],
  },
  {
    id: 5,
    question: "Quais sao seus objetivos?",
    options: [
      { text: "Aprender o basico", value: 1 },
      { text: "Ficar intermediario rapido", value: 2 },
      { text: "Falar e escrever avancado", value: 3 },
    ],
  },
];

const LevelQuizScreen = ({ navigation }) => {
  const { setLevel, userName } = useContext(AppContext);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const question = useMemo(() => QUESTIONS[step], [step]);
  const totalSteps = QUESTIONS.length;
  const progress = (step + 1) / totalSteps;

  const handleSelect = (value) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const goNext = () => {
    if (!answers[question.id]) {
      Alert.alert("Responda para continuar", "Selecione uma opcao antes de avancar.");
      return;
    }
    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1);
    } else {
      finalizeLevel();
    }
  };

  const finalizeLevel = () => {
    const score = Object.values(answers).reduce((acc, val) => acc + val, 0);
    const average = score / totalSteps;
    let computedLevel = "Beginner";
    if (average >= 2.5) {
      computedLevel = "Advanced";
    } else if (average >= 1.7) {
      computedLevel = "Intermediate";
    }
    setLevel(computedLevel);
    navigation.replace("MainTabs");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Quiz de Nivel</Text>
          <Text style={styles.subtitle}>Vamos ajustar o conteudo para voce, {getDisplayName(userName)}.</Text>
          <Text style={styles.progress}>
            Pergunta {step + 1} de {totalSteps}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.card}>
          <Text style={styles.question}>{question.question}</Text>
          {question.options.map((option) => {
            const selected = answers[question.id] === option.value;
            return (
              <TouchableOpacity
                key={option.text}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.85}
              >
                <Text style={[styles.optionText, selected && styles.optionSelectedText]}>{option.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <CustomButton title={step === totalSteps - 1 ? "Finalizar" : "Proxima"} onPress={goNext} style={styles.button} />
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
      paddingVertical: spacing.layout,
      gap: spacing.md,
    },
    hero: {
      gap: spacing.xs,
    },
    title: {
      fontSize: typography.heading + 2,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: typography.fonts.heading,
    },
    progress: {
      fontSize: typography.body,
      color: colors.muted,
      fontFamily: typography.fonts.body,
    },
    subtitle: {
      fontSize: typography.body,
      color: colors.muted,
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
      fontSize: typography.subheading + 2,
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
    optionSelectedText: {
      color: colors.background,
      fontWeight: "700",
      fontFamily: typography.fonts.heading,
    },
    button: {
      marginTop: spacing.sm,
    },
    progressBar: {
      height: 10,
      backgroundColor: colors.gray,
      borderRadius: radius.md,
      overflow: "hidden",
      marginBottom: spacing.md,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
    },
  });

export default LevelQuizScreen;
