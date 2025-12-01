import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video } from "expo-av";
import { Feather } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { useThemeColors } from "../../hooks/useThemeColors";
import { AppContext } from "../../context/AppContext";
import { canAccessLevel } from "../../utils/levels";
import { collectionGroup, doc, limit, onSnapshot, query, where } from "firebase/firestore";
import { db, storage } from "../../services/firebase";
import { getDownloadURL, ref } from "firebase/storage";
import { saveLessonProgress } from "../../services/userService";

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

const parseDurationText = (value) => {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).toLowerCase().trim();
  const match = text.match(/(\d+)\s*([a-z]+)/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount)) return null;
  if (unit.startsWith("min") || unit === "m") return amount * 60000;
  if (unit.startsWith("s")) return amount * 1000;
  if (unit.startsWith("h")) return amount * 3600000;
  return null;
};

const parseResolutionWeight = (label = "") => {
  const match = String(label).match(/(\d{3,4})p/i);
  if (match) return Number(match[1]);
  return Number.MAX_SAFE_INTEGER;
};

const isHttpPath = (path = "") => /^https?:\/\//i.test(path);

const LessonScreen = ({ route, navigation }) => {
  const lessonId = route?.params?.lessonId || route?.params?.lesson?.id;
  const routeModuleId = route?.params?.moduleId || route?.params?.lesson?.moduleId || null;
  const [lesson, setLesson] = useState(route?.params?.lesson || null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [subtitleSegments, setSubtitleSegments] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [loading, setLoading] = useState(!lesson);
  const [duration, setDuration] = useState(null);
  const [watchSaved, setWatchSaved] = useState(false);
  const [qualityOptions, setQualityOptions] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [videoUrlCache, setVideoUrlCache] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { level: userLevel, lessonsCompleted = {}, currentUser, moduleUnlocks = {}, modules = [] } = useContext(AppContext);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const modulesEnabled = modules && modules.length > 0;
  const firstModuleId = modulesEnabled ? modules[0]?.id : null;
  const lessonModuleId = lesson?.moduleId || lesson?.module || null;
  const isLessonModuleUnlocked = useMemo(() => {
    if (!modulesEnabled || !lessonModuleId) return true;
    if (lessonModuleId === firstModuleId) return true;
    const entry = moduleUnlocks?.[lessonModuleId];
    return entry?.passed === true || entry?.status === "unlocked";
  }, [firstModuleId, lessonModuleId, moduleUnlocks, modulesEnabled]);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!lessonId) return undefined;
    let unsubscribe = () => {};
    const handleDoc = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() || {};
        setLesson({ id: snapshot.id, moduleId: data?.moduleId || data?.module || routeModuleId || null, ...data });
      }
      setLoading(false);
    };

    if (routeModuleId) {
      const docRef = doc(db, "modules", routeModuleId, "lessons", lessonId);
      unsubscribe = onSnapshot(docRef, handleDoc, () => setLoading(false));
    } else {
      Alert.alert("Aula indisponivel", "Volte e selecione o modulo novamente para carregar a aula.", [
        { text: "Ok", onPress: () => navigation.goBack() },
      ]);
      setLoading(false);
    }
    return unsubscribe;
  }, [lessonId, routeModuleId, navigation]);

  useEffect(() => {
    if (!modulesEnabled || !lessonModuleId) return;
    if (!isLessonModuleUnlocked) {
      Alert.alert(
        "Modulo bloqueado",
        "Complete a prova de capacidade para liberar este modulo.",
        [{ text: "Escolher modulo", onPress: () => navigation.replace("ModuleList") }],
        { cancelable: false }
      );
    }
  }, [isLessonModuleUnlocked, lessonModuleId, modulesEnabled, navigation]);

  const normalizeQualities = (lessonData) => {
    const options = [];
    const appendOption = (label, path, value) => {
      if (!path) return;
      options.push({ label, path, value: value || label, weight: parseResolutionWeight(label), isHttp: isHttpPath(path) });
    };
    if (Array.isArray(lessonData?.videoVariants)) {
      lessonData.videoVariants.forEach((item, index) => {
        appendOption(item?.label || `Opcao ${index + 1}`, item?.path || item?.url, item?.value || item?.label || `q${index + 1}`);
      });
    } else if (lessonData?.videoVariants && typeof lessonData.videoVariants === "object") {
      Object.entries(lessonData.videoVariants).forEach(([key, value], index) => {
        if (typeof value === "string") {
          appendOption(key, value, key);
        } else if (value && typeof value === "object") {
          appendOption(value.label || key, value.path || value.url, value.value || value.label || key);
        }
      });
    }
    appendOption("Padrao", lessonData?.videoUrl || lessonData?.video, "default-url");
    appendOption("Padrao", lessonData?.videoPath || lessonData?.videoStoragePath, "default-storage");
    const unique = [];
    const seen = new Set();
    options.forEach((opt) => {
      if (!opt.path || seen.has(opt.path)) return;
      seen.add(opt.path);
      unique.push(opt);
    });
    return unique;
  };

  const resolveMediaUrl = async (targetPath) => {
    if (!targetPath) return null;
    if (isHttpPath(targetPath)) return targetPath;
    const videoRefStorage = ref(storage, targetPath);
    return getDownloadURL(videoRefStorage);
  };

  useEffect(() => {
    const loadMedia = async () => {
      if (!lesson) return;
      try {
        const qualities = normalizeQualities(lesson);
        setQualityOptions(qualities);
        const sortedQualities = [...qualities].sort((a, b) => a.weight - b.weight);
        const lowest = sortedQualities[0];
        const initialQuality = selectedQuality || lowest?.value || qualities[0]?.value || "default";
        setSelectedQuality(initialQuality);
        if (qualities.length) {
          const target = qualities.find((q) => q.value === initialQuality) || qualities[0];
          const cacheKey = target.path;
          if (videoUrlCache[cacheKey]) {
            setVideoUrl(videoUrlCache[cacheKey]);
          } else {
            const url = await resolveMediaUrl(target.path);
            if (url) {
              setVideoUrlCache((prev) => ({ ...prev, [cacheKey]: url }));
              setVideoUrl(url);
            } else {
              setVideoUrl(null);
            }
          }
        } else {
          setVideoUrl(null);
        }
        if (!duration) {
          const parsed = parseDurationText(lesson.duration || lesson.durationMs || lesson.durationMillis);
          if (parsed) setDuration(parsed);
        }
        const captionPath = lesson.captionUrl || lesson.captionPath || lesson.subtitleUrl || lesson.subtitlePath;
        if (captionPath) {
          const captionUrl = isHttpPath(captionPath) ? captionPath : await getDownloadURL(ref(storage, captionPath));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, selectedQuality]);

  const changeQuality = async (value) => {
    if (value === selectedQuality) return;
    const next = qualityOptions.find((q) => q.value === value);
    if (!next) return;
    setSelectedQuality(value);
    if (videoUrlCache[next.path]) {
      setVideoUrl(videoUrlCache[next.path]);
      return;
    }
    try {
      const url = await resolveMediaUrl(next.path);
      if (url) {
        setVideoUrlCache((prev) => ({ ...prev, [next.path]: url }));
        setVideoUrl(url);
      }
    } catch (error) {
      console.warn("[Lesson] Falha ao trocar qualidade:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      if (!videoRef.current || !videoUrl) return;
      try {
        const status = await videoRef.current.getStatusAsync();
        if (mounted && status?.durationMillis && status.durationMillis !== duration) {
          setDuration(status.durationMillis);
        }
      } catch (error) {
        // ignore
      }
    };
    checkStatus();
    const timer = setTimeout(checkStatus, 500);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [videoUrl, duration]);

  const handlePlaybackStatusUpdate = async (status) => {
    if (status.isLoaded && status.durationMillis && status.durationMillis !== duration) {
      setDuration(status.durationMillis);
    }
    if (!status.isLoaded || !subtitleSegments.length) return;
    const { positionMillis } = status;
    const active = subtitleSegments.find((segment) => positionMillis >= segment.start && positionMillis <= segment.end);
    const text = active ? active.text : "";
    if (text !== currentSubtitle) {
      setCurrentSubtitle(text);
    }
    if (status.didJustFinish && lessonId && !watchSaved) {
      setWatchSaved(true);
      try {
        if (currentUser?.uid) {
          await saveLessonProgress(currentUser.uid, lessonId, {
            lessonTitle: lesson?.title,
            watched: true,
          });
        }
      } catch (error) {
        setWatchSaved(false);
        console.warn("[Lesson] Falha ao salvar visualizacao:", error);
      }
    }
  };

  const handleVideoLoad = (payload) => {
    if (payload?.durationMillis && payload.durationMillis !== duration) {
      setDuration(payload.durationMillis);
    }
  };

  const progressEntry = lessonsCompleted[lessonId] || {};
  const hasWatched = !!(progressEntry.watched || progressEntry.completed || progressEntry.score !== undefined);
  const isLessonAccessible = canAccessLevel(userLevel, lesson?.level);

  useEffect(() => {
    if (!lesson || !userLevel || !lesson.level || isLessonAccessible) return;
    Alert.alert(
      "Conteudo bloqueado",
      `Esta aula pertence ao nivel ${lesson.level}. Complete seu nivel atual (${userLevel}) para desbloquear.`,
      [{ text: "Ok", onPress: () => navigation.goBack() }]
    );
  }, [isLessonAccessible, lesson, navigation, userLevel]);

  const handleQuizPress = () => {
    if (!isLessonAccessible) {
      Alert.alert(
        "Conteudo bloqueado",
        `Esta aula pertence ao nivel ${lesson?.level || "superior"}. Complete seu nivel atual (${userLevel}) para desbloquear.`
      );
      return;
    }
    if (!hasWatched) {
      Alert.alert(
        "Assista antes do quiz",
        "Veja a aula ate o final para liberar o quiz. Depois, voce pode refazer quantas vezes quiser.",
        [{ text: "Ok" }]
      );
      return;
    }
    navigation.navigate("LessonQuiz", {
      lessonId: lesson?.id || lessonId,
      lessonTitle: lesson?.title,
      lessonLevel: lesson?.level,
    });
  };

  const durationLabel = duration
    ? duration >= 60000
      ? (() => {
          const minutes = Math.floor(duration / 60000);
          const seconds = Math.floor((duration % 60000) / 1000);
          return seconds > 0 ? `${minutes}m${seconds}s` : `${minutes}m`;
        })()
      : `${Math.floor(duration / 1000)} s`
    : lesson?.duration || "10 min";

  const renderPlayer = (fullscreen = false) => {
    const wrapperStyle = fullscreen ? styles.fullscreenWrapper : styles.videoWrapper;
    const videoStyle = fullscreen ? styles.fullscreenVideo : styles.video;
    const controlColor = fullscreen ? "#fff" : theme.text;
    const controlBg = fullscreen ? "rgba(255,255,255,0.08)" : theme.surface;
    const controlBorder = fullscreen ? "rgba(255,255,255,0.35)" : theme.border;
    return (
      <View style={wrapperStyle}>
        {qualityOptions.length > 1 && (
          <View style={styles.qualityRow}>
            {qualityOptions.map((option) => {
              const active = option.value === selectedQuality;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.qualityChip,
                    { backgroundColor: controlBg, borderColor: controlBorder },
                    active && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => changeQuality(option.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.qualityText,
                      { color: controlColor },
                      active && { color: theme.background, fontWeight: "700" },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={styles.playerTopRow}>
          <TouchableOpacity
            onPress={() => setShowSubtitles((prev) => !prev)}
            style={[
              styles.subtitleToggle,
              { backgroundColor: controlBg, borderColor: controlBorder },
              fullscreen && styles.subtitleToggleFullscreen,
            ]}
            activeOpacity={0.8}
          >
            <Feather name={showSubtitles ? "eye" : "eye-off"} size={14} color={controlColor} />
            <Text style={[styles.subtitleToggleText, { color: controlColor }, fullscreen && { color: "#fff" }]}>
              {showSubtitles ? "Legendas on" : "Legendas off"}
            </Text>
          </TouchableOpacity>
          {!fullscreen && (
            <TouchableOpacity
              onPress={() => setIsFullscreen(true)}
              style={[styles.fullscreenButton, { backgroundColor: controlBg, borderColor: controlBorder }]}
              activeOpacity={0.8}
            >
              <Feather name="maximize" size={16} color={controlColor} />
            </TouchableOpacity>
          )}
          {fullscreen && (
            <TouchableOpacity
              onPress={() => setIsFullscreen(false)}
              style={[styles.fullscreenButton, { backgroundColor: controlBg, borderColor: controlBorder }]}
              activeOpacity={0.8}
            >
              <Feather name="x" size={18} color={controlColor} />
            </TouchableOpacity>
          )}
        </View>
        {!videoUrl && (
          <View style={[videoStyle, styles.videoPlaceholder]}>
            <Text style={styles.videoBadgeText}>{qualityOptions.length ? "Carregando video..." : "Video nao disponivel"}</Text>
          </View>
        )}
        {videoUrl && (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={videoStyle}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
            progressUpdateIntervalMillis={250}
            preferredPeakBitrate={800000}
            onLoad={handleVideoLoad}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
        )}
        {showSubtitles && (
          <View style={[styles.subtitleOverlay, fullscreen && styles.subtitleOverlayFullscreen]}>
            <Text style={[styles.subtitleOverlayText, fullscreen && styles.subtitleOverlayTextFullscreen]}>
              {currentSubtitle || "Carregando legendas..."}
            </Text>
          </View>
        )}
      </View>
    );
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
                <Text style={styles.subheading}>Nivel: {lesson?.level || "A1"}</Text>
              </View>
              <View style={styles.tag}>
                <Feather name="clock" size={14} color={theme.background} />
                <Text style={styles.tagText}>{durationLabel}</Text>
              </View>
            </View>
            {renderPlayer(false)}
            {lesson?.transcript ? (
              <View style={styles.transcript}>
                <Text style={styles.sectionTitle}>Transcricao</Text>
                <Text style={styles.body}>{lesson.transcript}</Text>
              </View>
            ) : null}
            <CustomButton title="Realizar atividade" onPress={handleQuizPress} />
          </>
        )}
      </ScrollView>
      {isFullscreen && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setIsFullscreen(false)}>
          <View style={styles.fullscreenOverlay}>
            <View style={[styles.fullscreenContent, { width: screenWidth, height: screenHeight }]}>{renderPlayer(true)}</View>
          </View>
        </Modal>
      )}
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
    fullscreenWrapper: {
      flex: 1,
      backgroundColor: "#000",
      borderRadius: 0,
      overflow: "hidden",
      position: "relative",
      justifyContent: "center",
    },
    qualityRow: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.sm,
      flexDirection: "row",
      gap: spacing.xs,
      zIndex: 1,
    },
    qualityChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    qualityChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    qualityText: {
      fontSize: typography.small,
      color: colors.text,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
    qualityTextActive: {
      color: colors.background,
    },
    video: {
      flex: 1,
    },
    fullscreenVideo: {
      flex: 1,
      width: "100%",
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
    subtitleOverlay: {
      position: "absolute",
      left: spacing.sm,
      right: spacing.sm,
      bottom: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: radius.sm,
    },
    subtitleOverlayFullscreen: {
      bottom: spacing.md,
    },
    subtitleOverlayText: {
      color: colors.background,
      fontFamily: typography.fonts.body,
      textAlign: "center",
    },
    subtitleOverlayTextFullscreen: {
      color: "#fff",
    },
    subtitleToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs / 2,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      alignSelf: "flex-start",
      borderRadius: radius.sm,
      borderWidth: 1,
    },
    subtitleToggleFullscreen: {
      backgroundColor: "rgba(0,0,0,0.35)",
      borderColor: "rgba(255,255,255,0.35)",
    },
    subtitleToggleText: {
      color: colors.text,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
    fullscreenButton: {
      marginLeft: "auto",
      padding: spacing.xs,
      borderRadius: radius.sm,
      borderWidth: 1,
    },
    playerTopRow: {
      position: "absolute",
      top: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      zIndex: 2,
      gap: spacing.sm,
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
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
      flexWrap: "wrap",
    },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      alignSelf: "flex-start",
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
    fullscreenOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.sm,
    },
    fullscreenContent: {
      width: "100%",
      height: "100%",
    },
  });

export default LessonScreen;
