import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { spacing, typography, radius } from "../../styles/theme";
import { AppContext } from "../../context/AppContext";
import { getDisplayName } from "../../utils/userName";
import { useThemeColors } from "../../hooks/useThemeColors";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../services/firebase";
import { canAccessLevel } from "../../utils/levels";
import CustomButton from "../../components/CustomButton";

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
  const friendlyName = getDisplayName(userName);
  const [filter, setFilter] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableLevels, setAvailableLevels] = useState(["Todas"]);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const modulesEnabled = modules && modules.length > 0;
  const firstModuleId = modulesEnabled ? modules[0]?.id : null;
  const activeModule = useMemo(() => modules.find((item) => item.id === activeModuleId), [modules, activeModuleId]);

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

  useEffect(() => {
    const lessonsQuery = query(collection(db, "lessons"), orderBy("order"));
    const unsubscribe = onSnapshot(
      lessonsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const payload = docSnap.data();
          return {
            id: docSnap.id,
            title: payload.title || "Aula",
            level: payload.level || "Discoverer",
            order: payload.order ?? 0,
            moduleId: payload.moduleId || payload.module || null,
          };
        });
        setLessons(data);
        const levels = Array.from(new Set(data.map((item) => item.level))).filter(Boolean);
        setAvailableLevels(["Todas", ...levels]);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentLevel) {
      setFilter(currentLevel);
    }
  }, [currentLevel]);

  useEffect(() => {
    const moduleFromRoute = route?.params?.moduleId;
    if (moduleFromRoute && moduleFromRoute !== activeModuleId) {
      setActiveModuleId(moduleFromRoute);
      setSelectedModuleId(moduleFromRoute);
    }
  }, [route?.params?.moduleId]);

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
    if (!modulesEnabled || !activeModuleId) return;
    if (!isModuleUnlocked(activeModuleId)) {
      Alert.alert(
        "Módulo bloqueado",
        "Complete a prova de capacidade para liberar este módulo.",
        [
          {
            text: "Fazer prova",
            onPress: () =>
              navigation.replace("ModuleAssessment", {
                moduleId: activeModuleId,
                moduleTitle: activeModule?.title || "Módulo",
              }),
          },
          { text: "Escolher módulo", onPress: () => navigation.replace("ModuleList") },
        ],
        { cancelable: true }
      );
    }
  }, [activeModuleId, activeModule?.title, isModuleUnlocked, modulesEnabled, navigation]);

  const filteredLessons = useMemo(() => {
    const targetModuleId = modulesEnabled ? activeModuleId || firstModuleId : null;
    return lessons.filter((item) => {
      const matchesLevel = filter === "Todas" || item.level?.toLowerCase() === filter.toLowerCase();
      const matchesQuery = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModule =
        !targetModuleId ||
        item.moduleId === targetModuleId ||
        (!item.moduleId && targetModuleId === firstModuleId);
      return matchesLevel && matchesQuery && matchesModule;
    });
  }, [filter, searchTerm, lessons, modulesEnabled, activeModuleId, firstModuleId]);

  const handleLessonPress = (item) => {
    if (!canAccessLevel(currentLevel, item.level)) {
      Alert.alert(
        "Aula indisponível",
        `Esta aula pertence ao nível ${item.level}. Complete seu nível atual (${currentLevel}) para desbloquear.`
      );
      return;
    }
    navigation.navigate("Lesson", { lessonId: item.id });
  };

  const renderItem = ({ item }) => {
    const entry = completedLessons[item.id] || {};
    const score = Number.isFinite(entry.score) ? entry.score : Number(entry.score);
    const completed = entry.completed === true || (Number.isFinite(score) && score >= 70);
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
        <Text style={styles.level}>Nivel: {item.level}</Text>
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
          <Text style={styles.heading}>Aulas disponíveis</Text>
          <Text style={styles.subheading}>{friendlyName}, escolha o nível e encontre sua próxima aula.</Text>
          {modulesEnabled ? (
            <View style={styles.moduleRow}>
              <Text style={styles.moduleLabel}>M?dulo: {activeModule?.title || "Selecionar"}</Text>
              <TouchableOpacity onPress={() => navigation.navigate("ModuleList")} activeOpacity={0.8}>
                <Text style={styles.changeModule}>Trocar m?dulo</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled"
        >
          {availableLevels.map((tag) => {
            const active = filter === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(tag)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
          <Text style={styles.heading}>Escolha um módulo</Text>
          <Text style={styles.subheading}>Selecione um módulo para listar as aulas correspondentes.</Text>
          <CustomButton title="Ir para módulos" onPress={() => navigation.replace("ModuleList")} />
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
    filterRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingRight: spacing.sm,
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
