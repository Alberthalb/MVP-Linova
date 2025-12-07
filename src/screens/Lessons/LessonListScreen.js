import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { spacing, typography, radius } from "../../styles/theme";
import { AppContext } from "../../context/AppContext";
import { useThemeColors } from "../../hooks/useThemeColors";
import { canAccessLevel } from "../../utils/levels";
import CustomButton from "../../components/CustomButton";
import { supabase } from "../../services/supabase";

const LessonListScreen = ({ navigation, route }) => {
  const {
    userName,
    level: currentLevel,
    lessonsCompleted: completedLessons = {},
    modules = [],
    moduleUnlocks = {},
    selectedModuleId,
    setSelectedModuleId,
  } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const modulesEnabled = modules && modules.length > 0;
  const firstModuleId = modulesEnabled ? modules[0]?.id : null;
  const activeModule = useMemo(() => modules.find((item) => item.id === activeModuleId), [modules, activeModuleId]);
  const moduleNameById = useMemo(() => {
    const map = {};
    modules.forEach((m) => {
      if (m?.id) map[m.id] = m.title || m.name || `Modulo ${m.id}`;
    });
    return map;
  }, [modules]);

  const isModuleUnlocked = useCallback(
    (moduleId) => {
      if (!modulesEnabled) return true;
      if (!moduleId) return true;
      if (moduleId === firstModuleId) return true;
      const entry = moduleUnlocks?.[moduleId];
      return entry?.passed === true || entry?.status === "unlocked";
    },
    [firstModuleId, moduleUnlocks, modulesEnabled]
  );

  const fetchLessons = useCallback(async (moduleId) => {
    setLoading(true);
    try {
      const baseQuery = supabase
        .from("lessons")
        .select('id,title,level,module_id,"order",duration_ms,video_path,caption_path,video_url,caption_url,transcript');
      const queryBuilder = moduleId ? baseQuery.eq("module_id", moduleId) : baseQuery;
      const { data, error } = await queryBuilder.order("order", { ascending: true });
      if (error) {
        console.warn("[Lessons] Falha ao carregar:", error);
        setLessons([]);
        return;
      }
      const list = (data || []).map((row, index) => ({
        id: row.id,
        title: row.title || `Aula ${index + 1}`,
        level: row.level || row.level_tag || row.module_level || "A1",
        order: Number.isFinite(row.order) ? row.order : index,
        moduleId: row.module_id || moduleId || null,
        duration: row.duration || row.duration_text || null,
        durationMs: row.duration_ms || row.durationMs || row.durationMillis || null,
        videoPath: row.video_path || row.video_storage_path || row.videoPath || null,
        videoUrl: row.video_url || row.videoUrl || null,
        captionPath: row.caption_path || row.subtitle_path || row.captionPath || null,
        captionUrl: row.caption_url || row.subtitle_url || row.captionUrl || null,
        transcript: row.transcript || "",
      }));
      const sorted = list.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setLessons(sorted);
    } catch (err) {
      console.warn("[Lessons] Erro inesperado ao carregar:", err);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const moduleFromRoute = route?.params?.moduleId;
    if (moduleFromRoute && moduleFromRoute !== activeModuleId) {
      setActiveModuleId(moduleFromRoute);
      setSelectedModuleId(moduleFromRoute);
    }
  }, [route?.params?.moduleId, activeModuleId, setSelectedModuleId]);

  useEffect(() => {
    if (!activeModuleId && selectedModuleId) {
      setActiveModuleId(selectedModuleId);
    }
  }, [selectedModuleId, activeModuleId]);

  useEffect(() => {
    if (activeModuleId || !modules?.length) return;
    const fallback = modules[0];
    if (fallback?.id) {
      setActiveModuleId(fallback.id);
      setSelectedModuleId(fallback.id);
    }
  }, [modules, activeModuleId, setSelectedModuleId]);

  useEffect(() => {
    const targetModule = modulesEnabled ? activeModuleId || firstModuleId : null;
    fetchLessons(targetModule);
  }, [modulesEnabled, activeModuleId, firstModuleId, fetchLessons]);

  useEffect(() => {
    if (!modulesEnabled || !activeModuleId) return;
    if (!isModuleUnlocked(activeModuleId)) {
      Alert.alert(
        "Mdulo bloqueado",
        "Complete a prova de capacidade para liberar este mdulo.",
        [
          {
            text: "Fazer prova",
            onPress: () =>
              navigation.replace("ModuleAssessment", {
                moduleId: activeModuleId,
                moduleTitle: activeModule?.title || "Mdulo",
              }),
          },
          { text: "Escolher mdulo", onPress: () => navigation.replace("ModuleList") },
        ],
        { cancelable: true }
      );
    }
  }, [activeModuleId, activeModule?.title, isModuleUnlocked, modulesEnabled, navigation]);

  const filteredLessons = useMemo(() => {
    const targetModuleId = modulesEnabled ? activeModuleId || firstModuleId : null;
    return lessons.filter((item) => {
      const matchesQuery = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModule =
        !targetModuleId ||
        item.moduleId === targetModuleId ||
        (!item.moduleId && targetModuleId === firstModuleId);
      return matchesQuery && matchesModule;
    });
  }, [searchTerm, lessons, modulesEnabled, activeModuleId, firstModuleId]);

  const handleLessonPress = (item) => {
    if (!canAccessLevel(currentLevel, item.level)) {
      Alert.alert(
        "Aula indisponvel",
        `Esta aula pertence ao nvel ${item.level}. Complete seu nvel atual (${currentLevel}) para desbloquear.`
      );
      return;
    }
    navigation.navigate("Lesson", { lessonId: item.id, lesson: item, moduleId: item.moduleId || activeModuleId || null });
  };

  const renderItem = ({ item }) => {
    const entry = completedLessons[item.id] || {};
    const score = Number.isFinite(entry.score) ? entry.score : Number(entry.score);
    const completed = entry.completed === true || (Number.isFinite(score) && score >= 70);
    const moduleLabel = moduleNameById[item.moduleId] || (item.moduleId ? `Modulo ${item.moduleId}` : null);
    return (
      <TouchableOpacity
        style={[styles.card, completed && styles.cardCompleted]}
        onPress={() => handleLessonPress(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          {completed && (
            <View style={styles.completedBadge}>
              <Feather name="check-circle" size={14} color={theme.primary} />
              <Text style={styles.completedText}>Assistida</Text>
            </View>
          )}
        </View>
        <Text style={styles.level}>{moduleLabel || `Modulo ${item.level || ""}`.trim()}</Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Feather name="chevron-left" size={20} color={theme.primary} />
        <Text style={styles.backButtonText}>Voltar</Text>
      </TouchableOpacity>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Aulas disponiveis</Text>
          {modulesEnabled ? (
            <View style={styles.moduleRow}>
              <TouchableOpacity onPress={() => navigation.navigate("ModuleList")} activeOpacity={0.8}>
                <Text style={styles.changeModule}>Trocar modulo</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.search}>
        <Feather name="search" size={18} color={theme.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar aula"
          placeholderTextColor={theme.muted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
      {modulesEnabled ? (
        <Text style={styles.moduleDescription}>
          Voce esta estudando aulas do modulo {activeModule?.title || "selecionado"}.
        </Text>
      ) : null}
    </View>
  );

  const listEmpty = loading ? (
    <View style={styles.loader}>
      <ActivityIndicator color={theme.primary} />
      <Text style={styles.empty}>Carregando aulas...</Text>
    </View>
  ) : (
    <Text style={styles.empty}>Nenhuma aula encontrada.</Text>
  );

  if (modulesEnabled && !activeModuleId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.heading}>Escolha um mdulo</Text>
          <Text style={styles.subheading}>Selecione um mdulo para listar as aulas correspondentes.</Text>
          <CustomButton title="Ir para mdulos" onPress={() => navigation.replace("ModuleList")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={filteredLessons}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={listEmpty}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      paddingHorizontal: spacing.layout,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg * 2,
      gap: spacing.md,
    },
    heading: {
      fontSize: typography.heading,
      color: colors.primary,
      fontWeight: "700",
      marginBottom: spacing.md,
      fontFamily: typography.fonts.heading,
    },
    subheading: {
      fontSize: typography.body,
      color: colors.muted,
      fontFamily: typography.fonts.body,
    },
    moduleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.xs,
      flexWrap: "wrap",
    },
    moduleLabel: {
      color: colors.text,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
    },
    changeModule: {
      color: colors.accent,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
      textDecorationLine: "underline",
    },
    header: {
      gap: spacing.xs,
      marginBottom: spacing.md,
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
    card: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      position: "relative",
    },
    cardCompleted: {
      borderColor: colors.primary,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    title: {
      fontSize: typography.subheading + 1,
      fontWeight: "700",
      color: colors.text,
      fontFamily: typography.fonts.body,
      flex: 1,
      flexWrap: "wrap",
    },
    level: {
      marginTop: spacing.xs,
      fontSize: typography.body,
      color: colors.muted,
      fontFamily: typography.fonts.body,
    },
    completedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: colors.gray,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      flexShrink: 0,
      alignSelf: "flex-start",
    },
    completedText: {
      color: colors.text,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
    },
    chip: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: typography.small,
      color: colors.muted,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
    chipTextActive: {
      color: colors.background,
    },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: typography.body,
      color: colors.text,
      fontFamily: typography.fonts.body,
    },
    empty: {
      textAlign: "center",
      color: colors.muted,
      fontFamily: typography.fonts.body,
      marginTop: spacing.lg,
    },
    loader: {
      paddingVertical: spacing.lg,
      alignItems: "center",
      gap: spacing.sm,
    },
    fallbackContainer: {
      flex: 1,
      padding: spacing.layout,
      gap: spacing.sm,
      justifyContent: "center",
      backgroundColor: colors.background,
    },
  });

export default LessonListScreen;
