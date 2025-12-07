import React, { useContext, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { useThemeColors } from "../../hooks/useThemeColors";
import { AppContext } from "../../context/AppContext";
import { saveModuleUnlock, createOrUpdateUserProfile } from "../../services/userService";

const PASSING_SCORE = 70;

const ModuleAssessmentScreen = ({ navigation, route }) => {
  const moduleId = route?.params?.moduleId;
  const moduleTitle = route?.params?.moduleTitle || "Módulo";
  const { currentUser, setSelectedModuleId, setModuleUnlocks, setLevel, modules = [] } = useContext(AppContext);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const total = questions.length;
  const progress = total > 0 ? (step + 1) / total : 0;
  const currentQuestion = useMemo(() => questions[step], [questions, step]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!moduleId) {
        setQuestions([]);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("module_assessment_questions")
          .select("*")
          .eq("module_id", moduleId)
          .order("order", { ascending: true });
        if (error) throw error;
        if (!data || !data.length) {
          throw new Error("Sem perguntas");
        }
        const normalized = data.map((doc, index) => {
          const opts = Array.isArray(doc?.options) ? doc.options : [];
          return {
            id: doc.id || `q${index + 1}`,
            question: doc.question || `Pergunta ${index + 1}`,
            options: opts,
            correct: Number.isFinite(doc.correct) ? doc.correct : Number(doc?.correct) || 0,
          };
        });
        setQuestions(normalized);
      } catch (error) {
        Alert.alert("Prova indisponível", "Nenhuma pergunta encontrada para este módulo.");
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [moduleId]);

  const selectOption = (index) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: index }));
  };

  const goNext = () => {
    if (!currentQuestion) {
      Alert.alert("Avaliação indisponível", "Nenhuma pergunta encontrada para este módulo.");
      return;
    }
    if (answers[currentQuestion.id] === undefined) {
      Alert.alert("Responda para continuar", "Selecione uma alternativa antes de avançar.");
      return;
    }
    if (step < total - 1) {
      setStep((prev) => prev + 1);
    } else {
      finalizeAssessment();
    }
  };

  const finalizeAssessment = async () => {
    const correctCount = questions.filter((q) => answers[q.id] === q.correct).length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const passed = score >= PASSING_SCORE;
    if (!passed) {
      Alert.alert(
        "Ainda não liberado",
        `Você acertou ${correctCount}/${total} (${score}%). Tente novamente para liberar o módulo.`,
        [{ text: "Ok", onPress: () => navigation.goBack() }]
      );
      return;
    }
    try {
      const moduleInfo = modules.find((m) => m.id === moduleId);
      const moduleLevel = moduleInfo?.levelTag || moduleInfo?.level || null;

      if (currentUser?.id && moduleId) {
        await saveModuleUnlock(currentUser.id, moduleId, {
          passed: true,
          score,
          correctCount,
          totalQuestions: total,
        });
        await createOrUpdateUserProfile(currentUser.id, {
          currentModuleId: moduleId,
          current_module_id: moduleId,
          ...(moduleLevel ? { level: moduleLevel } : {}),
        });
        setModuleUnlocks((prev) => ({
          ...(prev || {}),
          [moduleId]: { passed: true, status: "unlocked", score, correctCount, totalQuestions: total, moduleTitle },
        }));
        if (moduleLevel) {
          setLevel(moduleLevel);
        }
      }
      setSelectedModuleId(moduleId);
      Alert.alert("Módulo liberado", "Prova concluída com sucesso. O módulo foi desbloqueado.", [
        {
          text: "Ir para aulas",
          onPress: () => navigation.replace("LessonList", { moduleId }),
        },
      ]);
    } catch (error) {
      Alert.alert("Erro ao salvar", "Não foi possível registrar a liberação do módulo.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={theme.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Prova de capacidade</Text>
        <Text style={styles.subtitle}>Módulo: {moduleTitle}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.progressLabel}>Carregando perguntas...</Text>
          </View>
        ) : total === 0 ? (
          <Text style={styles.empty}>Nenhuma pergunta disponível para este módulo.</Text>
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
            <CustomButton title={step === total - 1 ? "Finalizar" : "Próxima"} onPress={goNext} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      paddingHorizontal: spacing.layout,
      paddingVertical: spacing.layout,
      gap: spacing.md,
    },
    heading: {
      fontSize: typography.heading,
      fontFamily: typography.fonts.heading,
      color: colors.primary,
    },
    subtitle: {
      fontSize: typography.body,
      fontFamily: typography.fonts.body,
      color: colors.muted,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
    },
    question: {
      fontSize: typography.subheading + 1,
      fontFamily: typography.fonts.heading,
      color: colors.text,
      fontWeight: "600",
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
      color: colors.text,
      fontFamily: typography.fonts.body,
      fontSize: typography.body,
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
    },
    progressLabel: {
      color: colors.muted,
      fontFamily: typography.fonts.body,
    },
    empty: {
      textAlign: "center",
      color: colors.muted,
      fontFamily: typography.fonts.body,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    backText: {
      color: colors.primary,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
  });

export default ModuleAssessmentScreen;
