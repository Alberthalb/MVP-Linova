import React, { useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../navigation/AppNavigator";
import { colors, spacing, typography, radius } from "../../styles/theme";
import { getDisplayName } from "../../utils/userName";

const HomeScreen = ({ navigation }) => {
  const { level, userName } = useContext(AppContext);
  const displayName = getDisplayName(userName, null, "Linova");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>Bem-vindo</Text>
              <Text style={styles.welcome}>Ola, {displayName}!</Text>
            </View>
            <View style={styles.levelPill}>
              <Feather name="star" size={16} color={colors.primary} />
              <Text style={styles.levelText}>{level || "Beginner"}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Continue de onde parou e desbloqueie novas aulas.</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroChip} activeOpacity={0.9} onPress={() => navigation.navigate("LessonList")}>
              <Feather name="book-open" size={16} color={colors.background} />
              <Text style={styles.heroChipText}>Aulas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.heroChip, styles.heroChipGhost]} activeOpacity={0.9}>
              <Feather name="message-circle" size={16} color={colors.background} />
              <Text style={styles.heroChipText}>IA em breve</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.actions}>
          <CustomButton title="Ver aulas" onPress={() => navigation.navigate("LessonList")} />
          <CustomButton title="Gerenciar conta" variant="ghost" onPress={() => navigation.navigate("Account")} />
          <CustomButton title="Conversacao IA (visual)" variant="ghost" onPress={() => {}} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.layout,
    paddingVertical: spacing.layout,
    gap: spacing.lg,
    justifyContent: "flex-start",
  },
  welcome: {
    fontSize: typography.heading + 2,
    fontWeight: "700",
    color: colors.background,
    fontFamily: typography.fonts.heading,
  },
  subtitle: {
    fontSize: typography.body,
    color: "#E8EDFF",
    fontFamily: typography.fonts.body,
    marginTop: spacing.xs,
  },
  hero: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
    gap: spacing.sm,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  levelText: {
    color: colors.primary,
    fontWeight: "700",
    fontFamily: typography.fonts.body,
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  heroChipGhost: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroChipText: {
    color: colors.background,
    fontFamily: typography.fonts.body,
    fontWeight: "600",
  },
  actions: {
    gap: spacing.sm,
  },
});

export default HomeScreen;
