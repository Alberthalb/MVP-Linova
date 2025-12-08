import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AppContext } from "../../context/AppContext";
import { useThemeColors } from "../../hooks/useThemeColors";
import { spacing, typography, radius } from "../../styles/theme";
import CustomButton from "../../components/CustomButton";
import { createOrUpdateUserProfile, saveModuleUnlock } from "../../services/userService";

const FILTER_TAGS = ["Todos", "Iniciante", "Intermediario", "Avancado"];
const LEVEL_SEQUENCE = ["A1", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C1+", "C2"];
const levelOrder = (tag) => {
  const idx = LEVEL_SEQUENCE.indexOf(tag);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};

const levelBucket = (tag) => {
  const normalized = (tag || "").toString().trim();
  const upper = normalized.toUpperCase();
  const lower = normalized.toLowerCase();
  if (!normalized) return "Outros";
  if (["A1", "A2", "A2+"].includes(upper)) return "Iniciante";
  if (["B1", "B1+", "B2", "B2+"].includes(upper)) return "Intermediario";
  if (["C1", "C1+", "C2"].includes(upper)) return "Avancado";
  if (["iniciante", "basico", "basic", "beginner"].includes(lower)) return "Iniciante";
  if (["intermediario", "intermediate"].includes(lower)) return "Intermediario";
  if (["avancado", "advanced"].includes(lower)) return "Avancado";
  return "Outros";
};

const ModuleListScreen = ({ navigation }) => {
  const {
    modules,
    moduleUnlocks,
    selectedModuleId,
    setSelectedModuleId,
    currentUser,
    lessonsCompleted = {},
    moduleLessonCounts = {},
    lessonModuleMap = {},
  } = useContext(AppContext);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [filter, setFilter] = useState("Todos");
  const [pendingModule, setPendingModule] = useState(null);
  const isFirstLogin = useMemo(() => {
    const creation = currentUser?.created_at;
    const lastSignIn = currentUser?.last_sign_in_at || currentUser?.created_at;
    return creation && lastSignIn && creation === lastSignIn;
  }, [currentUser?.created_at, currentUser?.last_sign_in_at]);



  const availableModules = useMemo(() => {
    return (modules || [])
      .slice()
      .sort((a, b) => {
        const orderA = Number.isFinite(a?.order) ? a.order : levelOrder(a?.levelTag);
        const orderB = Number.isFinite(b?.order) ? b.order : levelOrder(b?.levelTag);
        return orderA - orderB;
      });
  }, [modules]);

  const firstModuleId = availableModules[0]?.id || null;

  const moduleProgress = useMemo(() => {
    const summary = {};
    Object.entries(lessonsCompleted || {}).forEach(([lessonId, entry]) => {
      const moduleId = lessonModuleMap[lessonId] || firstModuleId || "unassigned";
      if (!moduleId) return;
      if (!summary[moduleId]) {
        summary[moduleId] = { total: 0, earned: 0 };
      }
      summary[moduleId].total = Math.max(summary[moduleId].total, 1);
      const score = Number.isFinite(entry.score) ? entry.score : Number(entry.score);
      const completed = entry.completed === true || (Number.isFinite(score) && score >= 70);
      if (completed) {
        const xpEarned = Number.isFinite(entry?.xp) ? entry.xp : 10;
        summary[moduleId].earned += xpEarned;
      }
    });
    // Preenche total mesmo se nao carregamos as licoes (usa contagem agregada)
    Object.entries(moduleLessonCounts || {}).forEach(([moduleId, count]) => {
      if (!summary[moduleId]) {
        summary[moduleId] = { total: 0, earned: 0 };
      }
      summary[moduleId].total = Math.max(summary[moduleId].total, count || 0);
    });
    Object.keys(summary).forEach((key) => {
      summary[key].required = (summary[key].total || 0) * 10;
    });
    return summary;
  }, [lessonsCompleted, lessonModuleMap, firstModuleId, moduleLessonCounts]);

  useEffect(() => {
    if (!currentUser?.id) return;
    Object.entries(moduleProgress).forEach(([moduleId, progress]) => {
      const entry = moduleUnlocks?.[moduleId];
      if (progress?.required > 0 && progress?.earned >= progress.required && !entry) {
        saveModuleUnlock(currentUser.id, moduleId, { passed: true, status: "unlocked", reason: "xp" });
      }
    });
  }, [moduleProgress, moduleUnlocks, currentUser?.id]);

  const modulesByLevel = useMemo(() => {
    const grouped = {};
    (availableModules || []).forEach((m) => {
      const lvl = m.levelTag || m.level || m.tag || null;
      if (!lvl) return;
      grouped[lvl] = grouped[lvl] || [];
      grouped[lvl].push(m.id);
    });
    return grouped;
  }, [availableModules]);

  const isLevelCompleted = useCallback(
    (levelTag) => {
      const ids = modulesByLevel[levelTag] || [];
      if (!ids.length) return false;
      return ids.every((id) => {
        const entry = moduleUnlocks?.[id];
        return entry?.passed === true || entry?.status === "unlocked";
      });
    },
    [modulesByLevel, moduleUnlocks]
  );

  const isUnlocked = (moduleId, index) => {
    if (!moduleId) return false;
    const entry = moduleUnlocks?.[moduleId];
    const progress = moduleProgress?.[moduleId];
    const meetsXp = progress?.required > 0 && progress?.earned >= progress.required;
    const moduleInfo = availableModules.find((m) => m.id === moduleId);
    const moduleLevel = moduleInfo?.levelTag || moduleInfo?.level || moduleInfo?.tag || null;
    const moduleLevelIndex = LEVEL_SEQUENCE.indexOf(moduleLevel || "");

    // Primeiro módulo do nível inicial (A1) fica liberado por padrão
    if ((index === 0 || moduleId === firstModuleId) && moduleLevelIndex === 0) return true;

    // Para níveis acima de A1, exige nível anterior completo (ou desbloqueio explícito)
    if (moduleLevelIndex > 0) {
      const prevLevel = LEVEL_SEQUENCE[moduleLevelIndex - 1];
      const prevCompleted = isLevelCompleted(prevLevel);
      if (!prevCompleted && !(entry?.passed === true || entry?.status === "unlocked")) {
        return false;
      }
    }

    return entry?.passed === true || entry?.status === "unlocked" || meetsXp;
  };

  const filteredModules = useMemo(() => {
    if (filter === "Todos") return availableModules;
    return availableModules.filter((item) => levelBucket(item.levelTag || item.level || item.tag) === filter);
  }, [availableModules, filter]);

  const firstLockedIndex = useMemo(() => {
    if (!availableModules.length) return -1;
    for (let i = 0; i < availableModules.length; i += 1) {
      const m = availableModules[i];
      if (!isUnlocked(m.id, i)) return i;
    }
    return -1;
  }, [availableModules, isUnlocked]);

  const canTakeAssessment = useCallback(
    (moduleIndex) => {
      if (!availableModules.length) return false;
      // Só libera prova do primeiro módulo bloqueado da sequência (independente de filtro/seleção)
      return firstLockedIndex !== -1 && moduleIndex === firstLockedIndex;
    },
    [firstLockedIndex]
  );

  const handleEnterModule = async (module) => {
    if (!module?.id) {
      Alert.alert("Módulo indisponivel", "Nenhum Módulo cadastrado no momento.");
      return;
    }
    const moduleIndex = availableModules.findIndex((item) => item.id === module.id);
    const unlocked = isUnlocked(module.id, moduleIndex);
    if (!unlocked) {
      if (!canTakeAssessment(moduleIndex)) {
        Alert.alert("Prova indisponivel", "Você so pode fazer a prova do proximo Módulo na sequência.");
        return;
      }
      setPendingModule(module);
      return;
    }
    setSelectedModuleId(module.id);
    if (currentUser?.id) {
      await createOrUpdateUserProfile(currentUser.id, { currentModuleId: module.id, current_module_id: module.id });
    }
    navigation.navigate("LessonList", { moduleId: module.id });
  };

  const goToAssessment = () => {
    if (!pendingModule) return;
    navigation.navigate("ModuleAssessment", { moduleId: pendingModule.id, moduleTitle: pendingModule.title });
    setPendingModule(null);
  };

  const handleFilterChange = (tag) => {
    setFilter(tag);
  };

  useEffect(() => {
    if (!filteredModules.length) return;
    const stillSelected = filteredModules.some((m) => m.id === selectedModuleId);
    if (!stillSelected) {
      setSelectedModuleId(filteredModules[0]?.id || null);
    }
  }, [filteredModules, selectedModuleId, setSelectedModuleId]);

  const renderFilterChip = useCallback(
    ({ item: tag }) => {
      const active = filter === tag;
      return (
        <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={() => handleFilterChange(tag)} activeOpacity={0.85}>
          <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
        </TouchableOpacity>
      );
    },
    [filter, styles]
  );

  const renderItem = ({ item, index }) => {
    const unlocked = isUnlocked(item.id, index);
    const selected = item.id === selectedModuleId;
    const progress = moduleProgress?.[item.id] || { earned: 0, required: 0 };
    const moduleIndex = availableModules.findIndex((m) => m.id === item.id);
    const handleAssessmentPress = () => {
      if (moduleIndex !== firstLockedIndex) {
        Alert.alert(
          "Prova anterior necessaria",
          "Primeiro faça a prova do módulo anterior que está bloqueado. Depois disso, você poderá fazer a prova deste módulo."
        );
        return;
      }
      setPendingModule(item);
    };
    return (
      <TouchableOpacity style={[styles.card, selected && styles.cardSelected]} activeOpacity={0.85} onPress={() => handleEnterModule(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Feather name="layers" size={16} color={theme.primary} />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          <View style={[styles.badge, unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
            <Feather name={unlocked ? "unlock" : "lock"} size={14} color={unlocked ? theme.background : theme.accent} />
            <Text style={[styles.badgeText, unlocked ? styles.badgeTextUnlocked : styles.badgeTextLocked]}>
              {unlocked ? "Liberado" : "Prova exigida"}
            </Text>
          </View>
        </View>
        {item.levelTag ? <Text style={styles.levelTag}>Nivel sugerido: {item.levelTag}</Text> : null}
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        <Text style={styles.progressText}>
          {progress.earned} / {progress.required || 0} pontos
        </Text>
        {selected ? <Text style={styles.selectedHint}>Módulo selecionado</Text> : null}
        {!unlocked && (
          <TouchableOpacity style={styles.assessmentLink} onPress={handleAssessmentPress} activeOpacity={0.8}>
            <Feather name="edit-3" size={14} color={theme.accent} />
            <Text style={styles.assessmentText}>Fazer prova de capacidade</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={theme.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Escolha um Módulo</Text>
        <Text style={styles.subheading}>
          {isFirstLogin
            ? "No primeiro acesso, comece pelo Módulo 1. Para pular para outro Módulo, conclua a prova de capacidade."
            : "Para pular para outro Módulo, conclua a prova de capacidade."}
        </Text>
        <FlatList
          data={FILTER_TAGS}
          keyExtractor={(item) => item}
          renderItem={renderFilterChip}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        />
        <FlatList
          data={filteredModules}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhum Módulo para este filtro.</Text>
            </View>
          }
        />
      </View>
      {pendingModule ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Prova de capacidade</Text>
            <Text style={styles.modalText}>
              Para avançar, primeiro faça a prova do módulo anterior que estiver bloqueado. Depois disso, você poderá fazer a prova para "{pendingModule.title}".
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setPendingModule(null)} style={styles.modalGhost} activeOpacity={0.8}>
                <Text style={styles.modalGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToAssessment} style={styles.modalButton} activeOpacity={0.9}>
                <Text style={styles.modalButtonText}>Fazer prova</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      paddingHorizontal: spacing.layout,
      paddingTop: spacing.layout,
      paddingBottom: 0,
      gap: spacing.sm,
    },
    heading: {
      fontSize: typography.heading + 2,
      fontFamily: typography.fonts.heading,
      color: colors.primary,
    },
    subheading: {
      fontSize: typography.body,
      fontFamily: typography.fonts.body,
      color: colors.muted,
      marginBottom: spacing.sm,
    },
    filterRow: {
      flexDirection: "row",
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
      alignItems: "center",
      paddingVertical: spacing.xs,
      marginTop: spacing.xs,
    },
    chip: {
      minHeight: 36,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md + spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 110,
      alignItems: "center",
      justifyContent: "center",
      elevation: 1,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    chipText: {
      fontFamily: typography.fonts.body,
      fontWeight: "700",
      color: colors.primary,
      fontSize: typography.small,
      textAlign: "center",
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    chipTextActive: {
      color: colors.surface,
    },
    list: {
      paddingVertical: spacing.sm,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
      flexGrow: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.xs,
      shadowColor: colors.cardShadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    cardSelected: {
      borderColor: colors.primary,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1 },
    cardTitle: {
      fontFamily: typography.fonts.heading,
      fontSize: typography.subheading,
      color: colors.text,
      flex: 1,
    },
    levelTag: {
      color: colors.muted,
      fontFamily: typography.fonts.body,
      fontSize: typography.small,
    },
    description: {
      color: colors.text,
      fontFamily: typography.fonts.body,
      fontSize: typography.body,
      lineHeight: 20,
    },
    progressText: {
      color: colors.muted,
      fontFamily: typography.fonts.body,
      fontSize: typography.small,
    },
    selectedHint: {
      color: colors.primary,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    badgeUnlocked: {
      backgroundColor: colors.primary,
    },
    badgeLocked: {
      backgroundColor: colors.gray,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeText: { fontFamily: typography.fonts.body, fontSize: typography.small, fontWeight: "700" },
    badgeTextUnlocked: { color: colors.background },
    badgeTextLocked: { color: colors.accent },
    assessmentLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    assessmentText: {
      color: colors.accent,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
    },
    backRow: {
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
    modalOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalCard: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: typography.subheading,
      fontFamily: typography.fonts.heading,
      color: colors.text,
      fontWeight: "700",
    },
    modalText: {
      fontFamily: typography.fonts.body,
      fontSize: typography.body,
      color: colors.textSecondary,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
    },
    modalButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
    },
    modalButtonText: {
      color: colors.surface,
      fontFamily: typography.fonts.button,
      fontWeight: "700",
    },
    modalGhost: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    modalGhostText: {
      color: colors.muted,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
    emptyState: {
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: spacing.md,
    },
    emptyText: {
      color: colors.muted,
      fontFamily: typography.fonts.body,
    },
    buttonSpacing: {
      marginTop: spacing.md,
    },
  });

export default ModuleListScreen;
