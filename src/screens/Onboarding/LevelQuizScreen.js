import React, { useContext, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../navigation/AppNavigator";
import { colors, spacing, typography } from "../../styles/theme";

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
  const { setLevel } = useContext(AppContext);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const question = useMemo(() => QUESTIONS[step], [step]);
  const totalSteps = QUESTIONS.length;

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
    navigation.replace("Home");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz de Nivel</Text>
      <Text style={styles.progress}>
        Pergunta {step + 1} de {totalSteps}
      </Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.heading + 2,
    fontWeight: "700",
    color: colors.primary,
  },
  progress: {
    fontSize: typography.body,
    color: colors.dark,
  },
  card: {
    backgroundColor: colors.light,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    flex: 1,
  },
  question: {
    fontSize: typography.subheading + 2,
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
  optionSelectedText: {
    color: colors.white,
    fontWeight: "700",
  },
  button: {
    marginTop: spacing.sm,
  },
});

export default LevelQuizScreen;