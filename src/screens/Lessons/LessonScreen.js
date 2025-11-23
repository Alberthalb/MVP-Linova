import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video } from "expo-av";
import { Feather } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { useThemeColors } from "../../hooks/useThemeColors";
import { doc, onSnapshot } from "firebase/firestore";
import { db, storage } from "../../services/firebase";
import { getDownloadURL, ref } from "firebase/storage";

const timeToMs = (timeString = "") => {
  const clean = timeString.replace(",", ".").trim();
  const parts = clean.split(":");
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts;
  const [sec, ms = "0"] = seconds.split(".");
  return (
    parseInt(hours, 10) * 3600000 +
    parseInt(minutes, 10) * 60000 +
    parseInt(sec, 10) * 1000 +
    parseInt(ms.padEnd(3, "0"), 10)
  );
};

const parseSubtitleFile = (text = "") => {
  const cleaned = text.replace(/\r/g, "").replace(/^WEBVTT.*\n/, "");
  const blocks = cleaned.split(/\n\n+/);
  const segments = [];
  blocks.forEach((block) => {
    const lines = block.split("\n").filter(Boolean);
    if (lines.length < 2) return;
    let timeLine = lines[0];
    if (/^\d+$/.test(lines[0])) {
      timeLine = lines[1];
      lines.splice(0, 2);
    } else {
      lines.splice(0, 1);
    }
    const [start, end] = timeLine.split("-->").map((item) => item.trim());
    if (!start || !end) return;
    const textContent = lines.join("\n");
    segments.push({
      start: timeToMs(start),
      end: timeToMs(end),
      text: textContent,
    });
  });
  return segments;
};

const LessonScreen = ({ route, navigation }) => {
  const lessonId = route?.params?.lessonId || route?.params?.lesson?.id;
  const [lesson, setLesson] = useState(route?.params?.lesson || null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [subtitleSegments, setSubtitleSegments] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [loading, setLoading] = useState(!lesson);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!lessonId) return;
    const docRef = doc(db, "lessons", lessonId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setLesson({ id: snapshot.id, ...snapshot.data() });
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [lessonId]);

  useEffect(() => {
    const loadMedia = async () => {
      if (!lesson) return;
      try {
        if (lesson.videoPath) {
          const videoRefStorage = ref(storage, lesson.videoPath);
          const url = await getDownloadURL(videoRefStorage);
          setVideoUrl(url);
        }
        if (lesson.captionPath) {
          const captionRef = ref(storage, lesson.captionPath);
          const captionUrl = await getDownloadURL(captionRef);
          const response = await fetch(captionUrl);
          const text = await response.text();
          const segments = parseSubtitleFile(text);
          setSubtitleSegments(segments);
        } else {
          setSubtitleSegments([]);
        }
        setCurrentSubtitle("");
      } catch (error) {
        console.warn("[Lesson] Falha ao carregar midia:", error);
      }
    };
    loadMedia();
  }, [lesson]);

  const handlePlaybackStatusUpdate = (status) => {
    if (!status.isLoaded || !subtitleSegments.length) return;
    const { positionMillis } = status;
    const active = subtitleSegments.find(
      (segment) => positionMillis >= segment.start && positionMillis <= segment.end
    );
    const text = active ? active.text : "";
    if (text !== currentSubtitle) {
      setCurrentSubtitle(text);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={theme.primary} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.subheading}>Carregando aula...</Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.heading}>{lesson?.title || "Aula"}</Text>
                <Text style={styles.subheading}>Nível: {lesson?.level || "Discoverer"}</Text>
              </View>
              <View style={styles.tag}>
                <Feather name="clock" size={14} color={theme.background} />
                <Text style={styles.tagText}>{lesson?.duration || "10 min"}</Text>
              </View>
            </View>
            <View style={styles.videoWrapper}>
              {!videoUrl && (
                <View style={[styles.video, styles.videoPlaceholder]}>
                  <Text style={styles.videoBadgeText}>Carregando vídeo...</Text>
                </View>
              )}
              {videoUrl && (
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  style={styles.video}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay={false}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                />
              )}
            </View>
            <TouchableOpacity onPress={() => setShowSubtitles((prev) => !prev)} style={styles.subtitleButton} activeOpacity={0.9}>
              <Text style={styles.subtitleButtonText}>{showSubtitles ? "Ocultar" : "Mostrar"} legendas</Text>
            </TouchableOpacity>
            {showSubtitles && (
              <View style={styles.subtitles}>
                <Text style={styles.subtitleText}>
                  {currentSubtitle || "Carregando legendas..."}
                </Text>
              </View>
            )}
            {lesson?.transcript && (
              <View style={styles.transcript}>
                <Text style={styles.sectionTitle}>Transcrição</Text>
                <Text style={styles.body}>{lesson.transcript}</Text>
              </View>
            )}
            <CustomButton
              title="Fazer quiz"
              onPress={() => navigation.navigate("LessonQuiz", { lessonId: lesson?.id || lessonId, lessonTitle: lesson?.title })}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
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
    videoPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.gray,
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
      borderWidth: 1,
      borderColor: colors.border,
    },
    subtitleText: {
      color: colors.text,
      fontFamily: typography.fonts.body,
      textAlign: "center",
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
    loader: {
      minHeight: 200,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
  });

export default LessonScreen;
