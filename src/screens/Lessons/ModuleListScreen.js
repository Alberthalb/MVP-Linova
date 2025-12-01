import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AppContext } from "../../context/AppContext";
import { useThemeColors } from "../../hooks/useThemeColors";
import { spacing, typography, radius } from "../../styles/theme";
import CustomButton from "../../components/CustomButton";
import { createOrUpdateUserProfile, saveModuleUnlock } from "../../services/userService";
import { collection, collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";

const FILTER_TAGS = ["Todos", "Iniciante", "Intermediario", "Avancado"];
const FALLBACK_MODULES = [
  { id: "module-a1", title: "Modulo A1", levelTag: "A1", description: "Primeiros passos e vocabulario essencial.", order: 0 },
  { id: "module-a2", title: "Modulo A2", levelTag: "A2", description: "Rotinas e expressoes frequentes.", order: 1 },
  { id: "module-a2-plus", title: "Modulo A2+", levelTag: "A2+", description: "Mensagens curtas e leitura guiada.", order: 2 },
  { id: "module-b1", title: "Modulo B1", levelTag: "B1", description: "Conversas basicas e compreensao geral.", order: 3 },
  { id: "module-b1-plus", title: "Modulo B1+", levelTag: "B1+", description: "Comunicacao mais segura em situacoes variadas.", order: 4 },
  { id: "module-b2", title: "Modulo B2", levelTag: "B2", description: "Textos claros e discussoes com confianca.", order: 5 },
  { id: "module-b2-plus", title: "Modulo B2+", levelTag: "B2+", description: "Argumentacao e nuances em temas complexos.", order: 6 },
  { id: "module-c1", title: "Modulo C1", levelTag: "C1", description: "Linguagem flexivel em contextos profissionais.", order: 7 },
  { id: "module-c1-plus", title: "Modulo C1+", levelTag: "C1+", description: "Precisao alta em temas tecnicos e abstratos.", order: 8 },
  { id: "module-c2", title: "Modulo C2", levelTag: "C2", description: "Dominio avancado e naturalidade plena.", order: 9 },
];

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
  const { modules, moduleUnlocks, selectedModuleId, setSelectedModuleId, currentUser, lessonsCompleted = {} } = useContext(AppContext);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [filter, setFilter] = useState("Todos");
  const [pendingModule, setPendingModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const isFirstLogin = useMemo(() => {
    const creation = currentUser?.metadata?.creationTime;
    const lastSignIn = currentUser?.metadata?.lastSignInTime;
    return creation && lastSignIn && creation === lastSignIn;
  }, [currentUser?.metadata?.creationTime, currentUser?.metadata?.lastSignInTime]);

  const availableModules = useMemo(() => {
    const source = modules?.length ? modules : FALLBACK_MODULES;
    return source
      .slice()
      .sort((a, b) => {
        const orderA = Number.isFinite(a?.order) ? a.order : levelOrder(a?.levelTag);
        const orderB = Number.isFinite(b?.order) ? b.order : levelOrder(b?.levelTag);
        return orderA - orderB;
      });
  }, [modules]);

  const firstModuleId = availableModules[0]?.id || null;

  useEffect(() => {
    const lessonsRef = collectionGroup(db, "lessons");
    const unsubscribe = onSnapshot(
      lessonsRef,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap, index) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data?.title || `Aula ${index + 1}`,
            moduleId: data?.moduleId || data?.module || null,
          };
        });
        setLessons(list);
      },
      () => setLessons([])
    );
    return unsubscribe;
  }, []);

  const moduleProgress = useMemo(() => {
    const summary = {};
    lessons.forEach((lesson) => {
      const moduleId = lesson.moduleId || firstModuleId || "unassigned";
      if (!summary[moduleId]) {
        summary[moduleId] = { total: 0, earned: 0 };
      }
      summary[moduleId].total += 1;
      const entry = lessonsCompleted[lesson.id] || {};
      const score = Number.isFinite(entry.score) ? entry.score : Number(entry.score);
      const completed = entry.watched === true || (Number.isFinite(score) && score >= 70);
      if (completed) {
        summary[moduleId].earned += 10;
      }
    });
    Object.keys(summary).forEach((key) => {
      summary[key].required = summary[key].total * 10;
    });
    return summary;
  }, [lessons, lessonsCompleted, firstModuleId]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    Object.entries(moduleProgress).forEach(([moduleId, progress]) => {
      const entry = moduleUnlocks?.[moduleId];
      if (progress?.required > 0 && progress?.earned >= progress.required && !entry) {
        saveModuleUnlock(currentUser.uid, moduleId, { passed: true, status: "unlocked", reason: "xp" });
      }
    });
  }, [moduleProgress, moduleUnlocks, currentUser?.uid]);

  const isUnlocked = (moduleId, index) => {
    if (!moduleId) return false;
    if (index === 0 || moduleId === firstModuleId) return true;
    const entry = moduleUnlocks?.[moduleId];
    const progress = moduleProgress?.[moduleId];
    const meetsXp = progress?.required > 0 && progress?.earned >= progress.required;
    return entry?.passed === true || entry?.status === "unlocked" || meetsXp;
  };

  const filteredModules = useMemo(() => {
    if (filter === "Todos") return availableModules;
    return availableModules.filter((item) => levelBucket(item.levelTag || item.level || item.tag) === filter);
  }, [availableModules, filter]);

  const handleEnterModule = async (module) => {
    if (!module?.id) {
      Alert.alert("Modulo indisponivel", "Nenhum modulo cadastrado no momento.");
      return;
    }
    const moduleIndex = availableModules.findIndex((item) => item.id === module.id);
    const unlocked = isUnlocked(module.id, moduleIndex);
    if (!unlocked) {
      setPendingModule(module);
      return;
    }
    setSelectedModuleId(module.id);
    if (currentUser?.uid) {
      await createOrUpdateUserProfile(currentUser.uid, { currentModuleId: module.id });
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
        {selected ? <Text style={styles.selectedHint}>Modulo selecionado</Text> : null}
        {!unlocked && (
          <TouchableOpacity style={styles.assessmentLink} onPress={() => setPendingModule(item)} activeOpacity={0.8}>
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
        <Text style={styles.heading}>Escolha um modulo</Text>
        <Text style={styles.subheading}>
          {isFirstLogin
            ? "No primeiro acesso, comece pelo Modulo 1. Para pular para outro modulo, conclua a prova de capacidade."
            : "Para pular para outro modulo, conclua a prova de capacidade."}
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
              <Text style={styles.emptyText}>Nenhum modulo para este filtro.</Text>
              <TouchableOpacity onPress={() => handleFilterChange("Todos")} activeOpacity={0.8}>
                <Text style={styles.emptyLink}>Ver todos os modulos</Text>
              </TouchableOpacity>
            </View>
          }
        />
        {filteredModules.length === 0 ? (
          <CustomButton title="Ver aulas" onPress={() => navigation.navigate("LessonList")} style={styles.buttonSpacing} />
        ) : (
          <CustomButton
            title="Ir para aulas do modulo atual"
            style={styles.buttonSpacing}
            onPress={() =>
              handleEnterModule(filteredModules.find((item) => item.id === selectedModuleId) || filteredModules[0] || { id: null })
            }
          />
        )}
      </View>
      {pendingModule ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Prova de capacidade</Text>
            <Text style={styles.modalText}>Para acessar "{pendingModule.title}", conclua a prova rapida. Se aprovado, o modulo sera liberado.</Text>
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
      paddingVertical: spacing.layout,
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
    emptyLink: {
      color: colors.accent,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
      textDecorationLine: "underline",
    },
    buttonSpacing: {
      marginTop: spacing.md,
    },
  });

export default ModuleListScreen;
