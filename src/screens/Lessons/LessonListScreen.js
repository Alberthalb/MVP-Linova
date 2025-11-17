import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { colors, spacing, typography } from "../../styles/theme";

const LESSONS = [
  { id: 1, title: "Basic Greetings", level: "Beginner" },
  { id: 2, title: "Daily Activities", level: "Beginner" },
  { id: 3, title: "Advanced Grammar", level: "Advanced" },
];

const LessonListScreen = ({ navigation }) => {
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Lesson", { lesson: item })} activeOpacity={0.85}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.level}>Nivel: {item.level}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Aulas disponiveis</Text>
      <FlatList data={LESSONS} renderItem={renderItem} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.list} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  heading: {
    fontSize: typography.heading,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.light,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  title: {
    fontSize: typography.subheading + 1,
    fontWeight: "700",
    color: colors.dark,
  },
  level: {
    marginTop: spacing.xs,
    fontSize: typography.body,
    color: "#555",
  },
});

export default LessonListScreen;