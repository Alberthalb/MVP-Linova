import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  PanResponder,
  Platform,
} from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video } from "expo-av";
import { Feather } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { useThemeColors } from "../../hooks/useThemeColors";
import { AppContext } from "../../context/AppContext";
import { canAccessLevel } from "../../utils/levels";
import { supabase, supabaseVideoBucket, supabaseCaptionsBucket } from "../../services/supabase";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [captionUrl, setCaptionUrl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const timelineRef = useRef(null);
  const trackMetricsRef = useRef({ width: 0, x: 0 });
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekMs, setSeekMs] = useState(null);
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
  const textTracksConfig = useMemo(
    () =>
      captionUrl
        ? [
            {
              uri: captionUrl,
              type: "text/vtt",
              language: "pt-BR",
              title: "Portugues",
            },
          ]
        : [],
    [captionUrl]
  );
  const selectedTextTrack = useMemo(() => {
    if (!captionUrl || !showSubtitles) return { type: "disabled" };
    return { type: "language", value: "pt-BR" };
  }, [captionUrl, showSubtitles]);
  const clearControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  }, []);
  const scheduleHideControls = useCallback(() => {
    clearControlsTimer();
    if (!isPlaying) return;
    controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, [clearControlsTimer, isPlaying]);
  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHideControls();
  }, [scheduleHideControls]);
  const hideNavBar = useCallback(async () => {
    if (Platform.OS !== "android") return;
    try {
      await NavigationBar.setVisibilityAsync("hidden");
    } catch (error) {
      // ignore
    }
  }, []);
  const showNavBar = useCallback(async () => {
    if (Platform.OS !== "android") return;
    try {
      await NavigationBar.setVisibilityAsync("visible");
    } catch (error) {
      // ignore
    }
  }, []);
  const forcePortrait = useCallback(async () => {
    try {
      await ScreenOrientation.unlockAsync();
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (error) {
      // ignore when orientation API is unavailable
    }
  }, []);

  const forceLandscape = useCallback(async () => {
    try {
      await ScreenOrientation.unlockAsync();
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    } catch (error) {
      // ignore when orientation API is unavailable
    }
  }, []);
  const exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    showControls();
    await showNavBar();
    await forcePortrait();
  }, [forcePortrait, showControls, showNavBar]);
  const enterFullscreen = useCallback(async () => {
    setIsFullscreen(true);
    showControls();
    await hideNavBar();
    await forceLandscape();
  }, [forceLandscape, showControls, hideNavBar]);

  useFocusEffect(
    useCallback(() => {
      forcePortrait();
      showNavBar();
      return () => {
        forcePortrait();
        showNavBar();
      };
    }, [forcePortrait, showNavBar])
  );

  useEffect(() => {
    const parentNav = navigation.getParent?.();
    if (!parentNav) return undefined;
    const prevStyleRef = { value: parentNav.getOptions?.().tabBarStyle };
    if (isFullscreen) {
      parentNav.setOptions({ tabBarStyle: { display: "none" } });
    } else {
      parentNav.setOptions({ tabBarStyle: prevStyleRef.value });
    }
    return () => {
      parentNav.setOptions({ tabBarStyle: prevStyleRef.value });
    };
  }, [isFullscreen, navigation]);

  useEffect(() => {
    let active = true;
    const loadLesson = async () => {
      if (!lessonId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
      if (!active) return;
      if (error || !data) {
        Alert.alert("Aula indisponivel", "Volte e selecione o modulo novamente para carregar a aula.", [
          { text: "Ok", onPress: () => navigation.goBack() },
        ]);
        setLoading(false);
        return;
      }
      setLesson({
        id: data.id,
        moduleId: data.module_id || data.module || routeModuleId || null,
        videoUrl: data.video_url || data.videoUrl || null,
        videoPath: data.video_path || data.videoPath || data.video_storage_path || null,
        captionUrl: data.caption_url || data.captionUrl || null,
        captionPath: data.caption_path || data.captionPath || data.subtitle_path || null,
        transcript: data.transcript || data.transcricao || data.texto || data.subtitle || data.caption || null,
        ...data,
      });
      setLoading(false);
    };
    loadLesson();
    return () => {
      active = false;
    };
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

  const mediaBucket = supabaseVideoBucket || "video";
  const captionsBucket = supabaseCaptionsBucket || mediaBucket;

const resolveMediaUrl = async (targetPath, bucket = mediaBucket) => {
    if (!targetPath) return null;
    if (isHttpPath(targetPath)) return targetPath;
    try {
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(targetPath);
      if (publicData?.publicUrl) return publicData.publicUrl;
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(targetPath, 21600);
      if (error) {
        console.warn("[Lesson] Falha ao gerar URL assinada no Supabase:", error.message);
        return null;
      }
      return data?.signedUrl || null;
    } catch (error) {
      console.warn("[Lesson] Caminho de mídia não resolvido:", error?.message || error);
      return null;
    }
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
            const url = await resolveMediaUrl(target.path, mediaBucket);
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
          const captionUrl = isHttpPath(captionPath) ? captionPath : await resolveMediaUrl(captionPath, captionsBucket);
          if (!captionUrl) {
            console.warn("[Lesson] Legenda ignorada: caminho invÃ¡lido ou nÃ£o resolvido");
            setSubtitleSegments([]);
            setCaptionUrl(null);
            return;
          }
          const response = await fetch(captionUrl);
          const text = await response.text();
          const segments = parseSubtitleFile(text);
          setSubtitleSegments(segments);
          setCaptionUrl(captionUrl);
        } else {
          setSubtitleSegments([]);
          setCaptionUrl(null);
        }
        setCurrentSubtitle("");
      } catch (error) {
        console.warn("[Lesson] Falha ao carregar midia:", error);
        setCaptionUrl(null);
        setSubtitleSegments([]);
        setCurrentSubtitle("");
      }
    };
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, selectedQuality]);

  const changeQuality = async (value) => {
    showControls();
    if (value === selectedQuality) return;
    const next = qualityOptions.find((q) => q.value === value);
    if (!next) return;
    setSelectedQuality(value);
    if (videoUrlCache[next.path]) {
      setVideoUrl(videoUrlCache[next.path]);
      return;
    }
    try {
      const url = await resolveMediaUrl(next.path, mediaBucket);
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

  useEffect(() => {
    if (isFullscreen) {
      hideNavBar();
    } else {
      showNavBar();
    }
  }, [isFullscreen, hideNavBar, showNavBar]);

  useEffect(() => {
    if (controlsVisible && isPlaying) {
      scheduleHideControls();
    } else {
      clearControlsTimer();
    }
    return clearControlsTimer;
  }, [controlsVisible, isPlaying, scheduleHideControls, clearControlsTimer]);

  const updateSeekFromGesture = useCallback(
    (nativeEvent) => {
      if (!duration) return { clampedMs: 0, ratio: 0 };
      const { width, x } = trackMetricsRef.current;
      const baseWidth = width || 1;
      const pointX = width ? nativeEvent.pageX - x : nativeEvent.locationX;
      const clampedX = Math.max(0, Math.min(pointX, baseWidth));
      const ratio = clampedX / baseWidth;
      const clampedMs = Math.max(0, Math.min(duration, ratio * duration));
      return { clampedMs, ratio };
    },
    [duration]
  );

  const commitSeek = useCallback(
    async (targetMs) => {
      if (!videoRef.current || !Number.isFinite(targetMs)) return;
      try {
        await videoRef.current.setPositionAsync(targetMs);
        setPositionMs(targetMs);
      } catch (error) {
        // ignore seek errors
      }
    },
    []
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          showControls();
          setIsSeeking(true);
          const { clampedMs } = updateSeekFromGesture(evt.nativeEvent);
          setSeekMs(clampedMs);
        },
        onPanResponderMove: (evt) => {
          const { clampedMs } = updateSeekFromGesture(evt.nativeEvent);
          setSeekMs(clampedMs);
        },
        onPanResponderRelease: (evt) => {
          const { clampedMs } = updateSeekFromGesture(evt.nativeEvent);
          setSeekMs(null);
          setIsSeeking(false);
          commitSeek(clampedMs);
          scheduleHideControls();
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => {
          setSeekMs(null);
          setIsSeeking(false);
        },
      }),
    [updateSeekFromGesture, commitSeek, showControls, scheduleHideControls]
  );

  const handlePlaybackStatusUpdate = async (status) => {
    if (status.isLoaded && status.durationMillis && status.durationMillis !== duration) {
      setDuration(status.durationMillis);
    }
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      if (!isSeeking) {
        setPositionMs(status.positionMillis || 0);
      }
      if (status.isPlaying) {
        setControlsVisible((prev) => prev); // keep state but trigger timer via effect
      } else {
        setControlsVisible(true);
      }
    }
    if (!status.isLoaded) return;
    if (!isSeeking) {
      setPositionMs(status.positionMillis || 0);
    }
    if (status.isPlaying) {
      setControlsVisible((prev) => prev);
    } else {
      setControlsVisible(true);
    }
    // Marca como visto se concluir ou passar de 80%
    const thresholdPassed =
      status.durationMillis && status.positionMillis && status.positionMillis >= status.durationMillis * 0.8;
    if ((status.didJustFinish || thresholdPassed) && lessonId && !watchSaved && currentUser?.id) {
      setWatchSaved(true);
      try {
        await saveLessonProgress(currentUser.id, lessonId, {
          lessonTitle: lesson?.title,
          watched: true,
          completed: false,
          xp: 0,
        });
      } catch (error) {
        setWatchSaved(false);
        console.warn("[Lesson] Falha ao salvar visualizacao:", error);
      }
    }
    if (!subtitleSegments.length) return;
    const { positionMillis } = status;
    const active = subtitleSegments.find((segment) => positionMillis >= segment.start && positionMillis <= segment.end);
    const text = active ? active.text : "";
    if (text !== currentSubtitle) {
      setCurrentSubtitle(text);
    }
  };

  const handleVideoLoad = (payload) => {
    if (payload?.durationMillis && payload.durationMillis !== duration) {
      setDuration(payload.durationMillis);
    }
  };

  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    showControls();
    try {
      const status = await videoRef.current.getStatusAsync();
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      scheduleHideControls();
    } catch (error) {
      // ignore playback toggle errors
    }
  }, [showControls, scheduleHideControls]);

  const progressEntry = lessonsCompleted[lessonId] || {};
  const progressWatched = progressEntry.watched || progressEntry.completed || progressEntry.score !== undefined;
  const hasWatched = watchSaved || !!progressWatched;
  const isLessonAccessible = canAccessLevel(userLevel, lesson?.level);

  useEffect(() => {
    // Sincroniza com o progresso ja salvo para manter o quiz liberado ao reabrir a aula
    setWatchSaved(Boolean(progressWatched));
  }, [lessonId, progressWatched]);

  useEffect(() => {
    if (!lesson || !userLevel || !lesson.level || isLessonAccessible) return;
    const targetLevel = lesson.level ? String(lesson.level) : "superior";
    const currentLevelLabel = userLevel ? String(userLevel) : "atual";
    const lockedMessage =
      "Esta aula pertence ao nivel " +
      targetLevel +
      ". Complete seu nivel atual (" +
      currentLevelLabel +
      ") para desbloquear.";
    Alert.alert("Conteudo bloqueado", lockedMessage, [{ text: "Ok", onPress: () => navigation.goBack() }]);
  }, [isLessonAccessible, lesson, navigation, userLevel]);

  const handleQuizPress = async () => {
    if (!isLessonAccessible) {
      const targetLevel = lesson?.level ? String(lesson.level) : "superior";
      const currentLevelLabel = userLevel ? String(userLevel) : "atual";
      const lockedMessage =
        "Esta aula pertence ao nivel " +
        targetLevel +
        ". Complete seu nivel atual (" +
        currentLevelLabel +
        ") para desbloquear.";
      Alert.alert("Conteudo bloqueado", lockedMessage);
      return;
    }

    const alreadyWatched =
      watchSaved ||
      progressEntry?.watched === true ||
      progressEntry?.completed === true ||
      typeof progressEntry?.score === "number";

    if (!alreadyWatched && currentUser?.id && (lesson?.id || lessonId)) {
      try {
        const { data } = await supabase
          .from("user_lessons_completed")
          .select("watched,completed,score")
          .eq("user_id", currentUser.id)
          .eq("lesson_id", lesson?.id || lessonId)
          .maybeSingle();
        const serverWatched = data?.watched === true || data?.completed === true || typeof data?.score === "number";
        if (serverWatched) {
          setWatchSaved(true);
        }
        if (serverWatched) {
          navigation.navigate("LessonQuiz", {
            lessonId: lesson?.id || lessonId,
            lessonTitle: lesson?.title,
            lessonLevel: lesson?.level,
          });
          return;
        }
      } catch (error) {
        console.warn("[Lesson] Falha ao verificar progresso no servidor:", error);
      }
    }

    if (!alreadyWatched) {
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
          return seconds > 0 ? minutes + "m" + seconds + "s" : minutes + "m";
        })()
      : Math.floor(duration / 1000) + " s"
    : lesson?.duration || "10 min";

  const formatTime = (ms) => {
    const totalSeconds = Math.floor((ms || 0) / 1000);
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return m + ":" + s;
  };

  const renderPlayer = () => {
    const fullscreen = isFullscreen;
    const wrapperStyle = fullscreen ? styles.fullscreenWrapper : styles.videoWrapper;
    const videoStyle = fullscreen ? styles.fullscreenVideo : styles.video;
    const controlColor = fullscreen ? "#fff" : theme.text;
    const controlBg = fullscreen ? "rgba(255,255,255,0.08)" : theme.surface;
    const controlBorder = fullscreen ? "rgba(255,255,255,0.35)" : theme.border;
    const displayPosition = isSeeking && seekMs !== null ? seekMs : positionMs;
    const progressPct = duration ? Math.min(100, Math.max(0, (displayPosition / duration) * 100)) : 0;
    return (
      <View style={wrapperStyle}>
        {qualityOptions.length > 1 && (
          <View style={styles.qualityRow} pointerEvents="box-none">
            {qualityOptions.map((option) => {
              const active = option.value === selectedQuality;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.qualityChip,
                    { backgroundColor: controlBg, borderColor: controlBorder },
                    active && { backgroundColor: theme.primary, borderColor: theme.primary },
                    !controlsVisible && styles.controlsHidden,
                  ]}
                  onPress={() => changeQuality(option.value)}
                  activeOpacity={0.8}
                  pointerEvents={controlsVisible ? "auto" : "none"}
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
        <View style={[styles.playerTopRow, !controlsVisible && styles.controlsHidden]}>
          <TouchableOpacity
            onPress={() => {
              setShowSubtitles((prev) => !prev);
              showControls();
            }}
            style={[
              styles.subtitleToggle,
              { backgroundColor: controlBg, borderColor: controlBorder },
              fullscreen && styles.subtitleToggleFullscreen,
            ]}
            activeOpacity={0.8}
            pointerEvents={controlsVisible ? "auto" : "none"}
          >
            <Feather name={showSubtitles ? "eye" : "eye-off"} size={14} color={controlColor} />
            <Text style={[styles.subtitleToggleText, { color: controlColor }, fullscreen && { color: "#fff" }]}>
              {showSubtitles ? "Legendas on" : "Legendas off"}
            </Text>
          </TouchableOpacity>
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
            useNativeControls={false}
            resizeMode="contain"
            shouldPlay={false}
            progressUpdateIntervalMillis={250}
            preferredPeakBitrate={800000}
            onLoad={handleVideoLoad}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            textTracks={textTracksConfig}
            selectedTextTrack={selectedTextTrack}
          />
        )}
        {videoUrl ? (
          <TouchableOpacity
            style={[styles.playPauseCenter, !controlsVisible && styles.controlsHidden]}
            onPress={togglePlayPause}
            activeOpacity={0.85}
            pointerEvents={controlsVisible ? "auto" : "none"}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
        {showSubtitles && !controlsVisible && (
          <View
            style={[
              styles.subtitleOverlay,
              fullscreen && styles.subtitleOverlayFullscreen,
              controlsVisible && styles.subtitleOverlayRaised,
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.subtitleOverlayText, fullscreen && styles.subtitleOverlayTextFullscreen]}>
              {currentSubtitle || "Carregando legendas..."}
            </Text>
          </View>
        )}
        <View
          style={[styles.playerBottomRow, !controlsVisible && styles.controlsHidden]}
          pointerEvents={controlsVisible ? "auto" : "none"}
        >
          <Text style={styles.progressLabel}>
            {formatTime(displayPosition)} / {formatTime(duration)}
          </Text>
          <View
            style={styles.timelineContainer}
            {...panResponder.panHandlers}
            onLayout={(e) => {
              timelineRef.current?.measureInWindow((pageX, _pageY, width) => {
                trackMetricsRef.current = { width, x: pageX };
              });
            }}
            ref={timelineRef}
            hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
          >
            <View style={styles.timelineTrack}>
              <View style={[styles.timelineProgress, { width: progressPct + "%" }]} />
              <View style={[styles.timelineThumb, { left: progressPct + "%" }]} />
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.fullscreenButton,
              { backgroundColor: fullscreen ? "rgba(255,255,255,0.2)" : controlBg, borderColor: controlBorder },
            ]}
            onPress={fullscreen ? exitFullscreen : enterFullscreen}
            activeOpacity={0.9}
            pointerEvents={controlsVisible ? "auto" : "none"}
          >
            <Feather name={fullscreen ? "minimize-2" : "maximize-2"} size={16} color={fullscreen ? "#fff" : controlColor} />
          </TouchableOpacity>
        </View>
        <View pointerEvents={controlsVisible ? "none" : "auto"} style={[StyleSheet.absoluteFill, { zIndex: 4 }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={showControls} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar hidden={isFullscreen} animated />
      <View style={styles.screen}>
        <View style={[styles.playerHolder, isFullscreen && styles.playerHolderFullscreen]}>
          {renderPlayer()}
        </View>
        {!isFullscreen && (
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
        )}
      </View>
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
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    playerHolder: {
      backgroundColor: "#000",
      position: "relative",
    },
    playerHolderFullscreen: {
      flex: 1,
      backgroundColor: "#000",
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
      backgroundColor: "#000",
      borderRadius: 0,
      overflow: "hidden",
      position: "relative",
      zIndex: 1,
    },
    fullscreenWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#000",
      borderRadius: 0,
      overflow: "hidden",
      justifyContent: "center",
      zIndex: 99,
      elevation: 20,
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
    controlsHidden: {
      opacity: 0,
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
      height: "100%",
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
      zIndex: 3,
    },
    subtitleOverlayFullscreen: {
      bottom: spacing.md,
      left: spacing.md,
      right: spacing.md,
    },
    subtitleOverlayRaised: {
      bottom: spacing.lg * 2,
    },
    subtitleOverlayText: {
      color: colors.background,
      fontFamily: typography.fonts.body,
      textAlign: "center",
    },
    subtitleOverlayTextFullscreen: {
      color: "#fff",
    },
    playPauseCenter: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: [{ translateX: -24 }, { translateY: -24 }],
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.6)",
      backgroundColor: "rgba(0,0,0,0.35)",
      zIndex: 3,
    },
    playerBottomRow: {
      position: "absolute",
      bottom: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      zIndex: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: "rgba(0,0,0,0.35)",
      borderRadius: radius.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
      gap: spacing.sm,
    },
    progressLabel: {
      fontFamily: typography.fonts.body,
      fontSize: typography.small,
      color: colors.background,
      minWidth: 120,
    },
    timelineContainer: {
      flex: 1,
      paddingHorizontal: spacing.xs,
      justifyContent: "center",
    },
    timelineTrack: {
      height: 12,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 6,
      overflow: "hidden",
      justifyContent: "center",
    },
    timelineProgress: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.primary,
    },
    timelineThumb: {
      position: "absolute",
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
      top: -4,
      marginLeft: -8,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 3,
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
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 42,
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
  });

export default LessonScreen;








