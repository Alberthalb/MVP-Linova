import React, { useContext, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../context/AppContext";
import { spacing, typography, radius } from "../../styles/theme";
import { getDisplayName } from "../../utils/userName";
import { useThemeColors } from "../../hooks/useThemeColors";
import { createOrUpdateUserProfile, fetchInitialQuizQuestions, saveInitialQuizResult } from "../../services/userService";
import { supabase } from "../../services/supabase";

const clampValue = (value, index) => {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return Math.min(3, Math.max(1, num));
  }
  return Math.min(3, Math.max(1, index + 1));
};

const normalizeQuestions = (items = []) =>
  items.map((item, qIndex) => {
    const opts = Array.isArray(item?.options) ? item.options : [];
    const normalizedOptions = opts.map((opt, idx) => {
      if (opt && typeof opt === "object") {
        const text = opt.text || opt.label || opt.value || `Opção ${idx + 1}`;
        const value = clampValue(opt.value ?? opt.score ?? opt.weight ?? opt.ordinal, idx);
        return { text, value };
      }
      return { text: String(opt), value: clampValue(opt, idx) };
    });
    return {
      id: item?.id ?? qIndex + 1,
      question: item?.question || `Pergunta ${qIndex + 1}`,
      options: normalizedOptions,
    };
  });

const LevelQuizScreen = ({ navigation }) => {
  const { setLevel, userName, currentUser } = useContext(AppContext);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const question = useMemo(() => questions[step], [step, questions]);
  const totalSteps = questions.length;
  const progress = (step + 1) / totalSteps;

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const fetched = await fetchInitialQuizQuestions();
        if (!fetched || !fetched.length) {
          throw new Error("Nenhuma pergunta disponível");
        }
        setQuestions(normalizeQuestions(fetched));
      } catch (error) {
        Alert.alert("Quiz indisponível", "Não foi possível carregar o quiz inicial. Tente novamente mais tarde.");
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, []);

  const handleSelect = (value) => {
    const safeValue = clampValue(value, 0);
    setAnswers((prev) => ({ ...prev, [question.id]: safeValue }));
  };

  const goNext = async () => {
    if (!question || !answers[question.id]) {
      Alert.alert("Responda para continuar", "Selecione uma opção antes de avançar.");
      return;
    }
    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1);
    } else {
      await finalizeLevel();
    }
  };

  const finalizeLevel = async () => {
    const values = Object.values(answers).map((v) => clampValue(v, 0));
    const score = values.reduce((acc, val) => acc + val, 0);
    const average = values.length ? score / values.length : 0;
    let suggestedLevel = "A1";
    if (average >= 2.97) {
      suggestedLevel = "C1+";
    } else if (average >= 2.9) {
      suggestedLevel = "C1";
    } else if (average >= 2.7) {
      suggestedLevel = "B2+";
    } else if (average >= 2.5) {
      suggestedLevel = "B2";
    } else if (average >= 2.3) {
      suggestedLevel = "B1+";
    } else if (average >= 2.1) {
      suggestedLevel = "B1";
    } else if (average >= 1.9) {
      suggestedLevel = "A2+";
    } else if (average >= 1.6) {
      suggestedLevel = "A2";
    }

    // Começa sempre no nível mais baixo, apenas guardando a sugestão
    const startingLevel = "A1";

    // Descobre o primeiro módulo (menor "order") para apontar o módulo inicial
    let firstModuleId = null;
    try {
      const { data: modulesData } = await supabase.from("modules").select("id, order").order("order", { ascending: true }).limit(1);
      firstModuleId = modulesData?.[0]?.id || null;
    } catch (_err) {
      firstModuleId = null;
    }
    setLevel(startingLevel);

    const ensureUserId = async () => {
      if (currentUser?.id) return currentUser.id;
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user?.id) return null;
      return data.user.id;
    };

    const uid = await ensureUserId();
    if (uid) {
      try {
        await saveInitialQuizResult(uid, {
          answers,
          score,
          average,
          suggestedLevel,
          startingLevel,
        });
        await createOrUpdateUserProfile(uid, {
          level: startingLevel,
          initialQuizSuggestedLevel: suggestedLevel,
          initialQuizScore: score,
          initialQuizAverage: average,
          initialQuizCompleted: true,
          currentModuleId: firstModuleId,
          current_module_id: firstModuleId,
        });
      } catch (error) {
        console.warn("[Quiz] Falha ao salvar resultado no Supabase:", error);
      }
    }
    navigation.replace("MainTabs");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Quiz de Nível</Text>
          <Text style={styles.subtitle}>Vamos ajustar o conteúdo para você, {getDisplayName(userName)}.</Text>
          <Text style={styles.progress}>
            Pergunta {step + 1} de {totalSteps}
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
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.question}>{question?.question || "Pergunta"}</Text>
              {question?.options?.map((option) => {
                const selected = answers[question.id] === option.value;
                return (
                  <TouchableOpacity
                    key={`${question.id}-${option.text}`}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.optionText, selected && styles.optionSelectedText]}>{option.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <CustomButton title={step === totalSteps - 1 ? "Finalizar" : "Próxima"} onPress={goNext} style={styles.button} />
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
    loader: {
      alignItems: "center",
      gap: spacing.xs,
    },
  });

export default LevelQuizScreen;
