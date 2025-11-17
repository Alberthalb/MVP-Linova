import React, { useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../navigation/AppNavigator";
import { colors, spacing, typography } from "../../styles/theme";

const HomeScreen = ({ navigation }) => {
  const { level } = useContext(AppContext);

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Ola!</Text>
      <Text style={styles.subtitle}>Seu nivel atual: {level || "Beginner (mock)"}</Text>
      <View style={styles.card}>
        <CustomButton title="Aulas" onPress={() => navigation.navigate("LessonList")} />
        <TouchableOpacity style={[styles.fakeButton, styles.spaced]} activeOpacity={0.85}>
          <Text style={styles.fakeButtonText}>Conversacao IA (visual)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: "center",
  },
  welcome: {
    fontSize: typography.heading + 2,
    fontWeight: "700",
    color: colors.primary,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.dark,
  },
  card: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  fakeButton: {
    backgroundColor: colors.gray,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  fakeButtonText: {
    fontSize: typography.body,
    color: colors.dark,
    fontWeight: "600",
  },
  spaced: {
    marginTop: spacing.sm,
  },
});

export default HomeScreen;