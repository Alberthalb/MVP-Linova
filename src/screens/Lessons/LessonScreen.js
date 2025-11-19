import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video } from "expo-av";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import CustomButton from "../../components/CustomButton";
import { colors, spacing, typography, radius } from "../../styles/theme";

const VIDEO_URL = "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4";
const TRANSCRIPT = "Neste trecho voce ve cumprimentos basicos, expressoes do dia a dia e pronuncia clara para praticar repeticao guiada.";

const LessonScreen = ({ route, navigation }) => {
  const lesson = route?.params?.lesson;
  const [showSubtitles, setShowSubtitles] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={colors.primary} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>{lesson?.title || "Aula"}</Text>
            <Text style={styles.subheading}>Nivel: {lesson?.level || "Beginner"}</Text>
          </View>
          <View style={styles.tag}>
            <Feather name="clock" size={14} color={colors.background} />
            <Text style={styles.tagText}>10 min</Text>
          </View>
        </View>
        <View style={styles.videoWrapper}>
          <LinearGradient colors={[colors.overlay, "transparent"]} style={styles.videoOverlay} />
          <View style={styles.videoBadge}>
            <Feather name="play-circle" size={16} color={colors.background} />
            <Text style={styles.videoBadgeText}>Player em desenvolvimento</Text>
          </View>
          <Video source={{ uri: VIDEO_URL }} style={styles.video} useNativeControls resizeMode="contain" shouldPlay />
        </View>
        <TouchableOpacity onPress={() => setShowSubtitles((prev) => !prev)} style={styles.subtitleButton} activeOpacity={0.9}>
        <Text style={styles.subtitleButtonText}>{showSubtitles ? "Desativar" : "Ativar"} legendas (em desenvolvimento)</Text>
      </TouchableOpacity>
      {showSubtitles && <Text style={styles.subtitles}>[Legendas em desenvolvimento] Hello! Welcome to your lesson.</Text>}
        <View style={styles.transcript}>
          <Text style={styles.sectionTitle}>Transcricao</Text>
          <Text style={styles.body}>{TRANSCRIPT}</Text>
        </View>
        <CustomButton
          title="Fazer quiz"
          onPress={() => navigation.navigate("LessonQuiz", { lessonId: lesson?.id || 0, lessonTitle: lesson?.title })}
        />
      </ScrollView>
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
  },
  content: {
    paddingHorizontal: spacing.layout,
    paddingBottom: spacing.layout,
    paddingTop: spacing.md,
    gap: spacing.md,
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
  heading: {
    fontSize: typography.heading + 2,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: typography.fonts.heading,
  },
  subheading: {
    fontSize: typography.body,
    color: colors.muted,
    fontFamily: typography.fonts.body,
  },
  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  video: {
    flex: 1,
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  videoBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  videoBadgeText: {
    color: colors.background,
    fontFamily: typography.fonts.body,
    fontWeight: "600",
  },
  subtitleButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray,
    borderRadius: 10,
  },
  subtitleButtonText: {
    color: colors.text,
    fontWeight: "600",
    fontFamily: typography.fonts.body,
  },
  subtitles: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 10,
    color: colors.text,
    fontFamily: typography.fonts.body,
  },
  transcript: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.subheading,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.fonts.heading,
  },
  body: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 22,
    fontFamily: typography.fonts.body,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  tagText: {
    color: colors.background,
    fontWeight: "700",
    fontFamily: typography.fonts.body,
  },
});

export default LessonScreen;
