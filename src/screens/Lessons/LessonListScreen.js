import React, { useContext, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { spacing, typography, radius } from "../../styles/theme";
import { AppContext } from "../../context/AppContext";
import { getDisplayName } from "../../utils/userName";
import { useThemeColors } from "../../hooks/useThemeColors";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../services/firebase";

const LessonListScreen = ({ navigation }) => {
  const { userName, level: currentLevel } = useContext(AppContext);
  const friendlyName = getDisplayName(userName);
  const [filter, setFilter] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableLevels, setAvailableLevels] = useState(["Todas"]);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

  const filteredLessons = useMemo(() => {
    return lessons.filter((item) => {
      const matchesLevel =
        filter === "Todas" || item.level?.toLowerCase() === filter.toLowerCase();
      const matchesQuery = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesLevel && matchesQuery;
    });
  }, [filter, searchTerm, lessons]);

  useEffect(() => {
    if (currentLevel) {
      setFilter(currentLevel);
    }
  }, [currentLevel]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("Lesson", { lessonId: item.id })}
      activeOpacity={0.85}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.level}>Nivel: {item.level}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={theme.primary} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Aulas disponiveis</Text>
            <Text style={styles.subheading}>
              {friendlyName}, escolha o nivel e encontre sua proxima aula.
            </Text>
          </View>
          <View style={styles.filterRow}>
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
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.empty}>Carregando aulas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLessons}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma aula encontrada.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.layout,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
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
    header: {
      gap: spacing.xs,
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
    list: {
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: typography.subheading + 1,
      fontWeight: "700",
      color: colors.text,
      fontFamily: typography.fonts.body,
    },
    level: {
      marginTop: spacing.xs,
      fontSize: typography.body,
      color: colors.muted,
      fontFamily: typography.fonts.body,
    },
    filterRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
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
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.sm,
    },
  });

export default LessonListScreen;
