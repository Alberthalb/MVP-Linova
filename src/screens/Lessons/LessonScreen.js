import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Video } from "expo-av";
import CustomButton from "../../components/CustomButton";
import { colors, spacing, typography } from "../../styles/theme";

const VIDEO_URL = "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4";
const TRANSCRIPT = "Neste trecho voce ve cumprimentos basicos, expressoes do dia a dia e pronuncia clara para praticar repeticao guiada.";

const LessonScreen = ({ route, navigation }) => {
  const lesson = route?.params?.lesson;
  const [showSubtitles, setShowSubtitles] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{lesson?.title || "Aula"}</Text>
      <Text style={styles.subheading}>Nivel: {lesson?.level || "Beginner"}</Text>
      <View style={styles.videoWrapper}>
        <Video source={{ uri: VIDEO_URL }} style={styles.video} useNativeControls resizeMode="contain" shouldPlay />
      </View>
      <TouchableOpacity onPress={() => setShowSubtitles((prev) => !prev)} style={styles.subtitleButton} activeOpacity={0.9}>
        <Text style={styles.subtitleButtonText}>{showSubtitles ? "Desativar" : "Ativar"} legendas (mock)</Text>
      </TouchableOpacity>
      {showSubtitles && <Text style={styles.subtitles}>[Legendas mockadas] Hello! Welcome to your lesson.</Text>}
      <View style={styles.transcript}>
        <Text style={styles.sectionTitle}>Transcricao</Text>
        <Text style={styles.body}>{TRANSCRIPT}</Text>
      </View>
      <CustomButton
        title="Fazer quiz"
        onPress={() => navigation.navigate("LessonQuiz", { lessonId: lesson?.id || 0, lessonTitle: lesson?.title })}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    fontSize: typography.heading + 2,
    fontWeight: "700",
    color: colors.primary,
  },
  subheading: {
    fontSize: typography.body,
    color: colors.dark,
  },
  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.light,
    borderRadius: 12,
    overflow: "hidden",
  },
  video: {
    flex: 1,
  },
  subtitleButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray,
    borderRadius: 10,
  },
  subtitleButtonText: {
    color: colors.dark,
    fontWeight: "600",
  },
  subtitles: {
    backgroundColor: colors.light,
    padding: spacing.md,
    borderRadius: 10,
    color: colors.dark,
  },
  transcript: {
    backgroundColor: colors.light,
    padding: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.subheading,
    fontWeight: "700",
    color: colors.dark,
  },
  body: {
    fontSize: typography.body,
    color: colors.dark,
    lineHeight: 22,
  },
});

export default LessonScreen;