import React, { useContext, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../styles/theme";
import { AppContext } from "../../navigation/AppNavigator";
import { getDisplayName } from "../../utils/userName";

const LESSONS = [
  { id: 1, title: "Basic Greetings", level: "Beginner" },
  { id: 2, title: "Daily Activities", level: "Beginner" },
  { id: 3, title: "Advanced Grammar", level: "Advanced" },
];

const LessonListScreen = ({ navigation }) => {
  const { userName } = useContext(AppContext);
  const friendlyName = getDisplayName(userName);
  const [filter, setFilter] = useState("Todas");
  const [query, setQuery] = useState("");

  const filteredLessons = useMemo(() => {
    return LESSONS.filter((item) => {
      const matchesLevel = filter === "Todas" || item.level === filter;
      const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
      return matchesLevel && matchesQuery;
    });
  }, [filter, query]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Lesson", { lesson: item })} activeOpacity={0.85}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.level}>Nivel: {item.level}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Aulas disponiveis</Text>
          <Text style={styles.subheading}>
            {friendlyName}, escolha o nivel e encontre sua proxima aula.
          </Text>
        </View>
        <View style={styles.filterRow}>
          {["Todas", "Beginner", "Advanced"].map((tag) => {
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
        <Feather name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar aula"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <FlatList
        data={filteredLessons}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma aula encontrada.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.layout,
    paddingTop: spacing.layout,
    paddingBottom: spacing.layout,
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
});

export default LessonListScreen;
