import React, { useContext, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AppContext } from "../../context/AppContext";
import { useThemeColors } from "../../hooks/useThemeColors";
import { spacing, typography, radius } from "../../styles/theme";
import CustomButton from "../../components/CustomButton";
import { createOrUpdateUserProfile } from "../../services/userService";

const FALLBACK_MODULES = [
  { id: "module-1", title: "Módulo 1 · Iniciante", levelTag: "Discoverer", description: "Primeiros passos e vocabulário essencial.", order: 0 },
  { id: "module-2", title: "Módulo 2 · Básico", levelTag: "Pathfinder", description: "Frases do dia a dia e compreensão inicial.", order: 1 },
  { id: "module-3", title: "Módulo 3 · Intermediário", levelTag: "Communicator", description: "Conversas guiadas e listening prático.", order: 2 },
  { id: "module-4", title: "Módulo 4 · Intermediário+", levelTag: "Connector", description: "Contextos sociais/profissionais e narrativas.", order: 3 },
  { id: "module-5", title: "Módulo 5 · Avançado", levelTag: "Storyteller", description: "Apresentações, argumentos e nuances.", order: 4 },
];

const ModuleListScreen = ({ navigation }) => {
  const { modules, moduleUnlocks, selectedModuleId, setSelectedModuleId, currentUser } = useContext(AppContext);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pendingModule, setPendingModule] = useState(null);

  const availableModules = modules?.length ? modules : FALLBACK_MODULES;
  const firstModuleId = availableModules[0]?.id || null;

  const isUnlocked = (moduleId, index) => {
    if (!moduleId) return false;
    if (index === 0 || moduleId === firstModuleId) return true;
    const entry = moduleUnlocks?.[moduleId];
    return entry?.passed === true || entry?.status === "unlocked";
  };

  const handleEnterModule = async (module) => {
    if (!module?.id) {
      Alert.alert("Módulo indisponível", "Nenhum módulo cadastrado no momento.");
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

  const renderItem = ({ item, index }) => {
    const unlocked = isUnlocked(item.id, index);
    const selected = item.id === selectedModuleId;
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
        {item.levelTag ? <Text style={styles.levelTag}>Nível sugerido: {item.levelTag}</Text> : null}
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        {selected ? <Text style={styles.selectedHint}>Módulo selecionado</Text> : null}
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
        <Text style={styles.heading}>Escolha um módulo</Text>
        <Text style={styles.subheading}>
          No primeiro acesso, inicie pelo Módulo 1. Para pular para outro módulo, conclua a prova de capacidade.
        </Text>
        <FlatList
          data={availableModules}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
        />
        {availableModules.length === 0 ? (
          <CustomButton title="Ver aulas" onPress={() => navigation.navigate("LessonList")} />
        ) : (
          <CustomButton
            title="Ir para aulas do módulo atual"
            onPress={() =>
              handleEnterModule(
                availableModules.find((item) => item.id === selectedModuleId) || availableModules[0] || { id: null }
              )
            }
          />
        )}
      </View>
      {pendingModule ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Prova de capacidade</Text>
            <Text style={styles.modalText}>
              Para acessar "{pendingModule.title}", conclua a prova rápida. Se aprovado, o módulo será liberado.
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
    list: {
      paddingVertical: spacing.sm,
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
      color: colors.textSecondary,
      fontSize: typography.body,
      lineHeight: 20,
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
  });

export default ModuleListScreen;
