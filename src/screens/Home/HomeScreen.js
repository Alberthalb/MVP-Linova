import React, { useContext, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../context/AppContext";
import { spacing, typography, radius } from "../../styles/theme";
import { getDisplayName } from "../../utils/userName";
import { useThemeColors, useIsDarkMode } from "../../hooks/useThemeColors";

const levelDescriptions = {
  Discoverer: "Discoverer • Você está dando os primeiros passos e explora o idioma com conteúdo guiado.",
  Pathfinder: "Pathfinder • Entende o básico e já se vira em situações simples.",
  Communicator: "Communicator • Conversa com consistência e entende boa parte das interações.",
  Connector: "Connector • Se expressa com clareza em contextos sociais e profissionais.",
  Storyteller: "Storyteller • Domina nuances, argumenta e apresenta ideias complexas em inglês.",
};

const HomeScreen = ({ navigation }) => {
  const { level, userName, setDarkMode, authReady } = useContext(AppContext);
  const displayName = authReady && userName ? getDisplayName(userName, null, "Linova") : "";
  const [isIaModalVisible, setIaModalVisible] = useState(false);
  const [statInfo, setStatInfo] = useState(null);
  const [levelInfo, setLevelInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useThemeColors();
  const isDarkMode = useIsDarkMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const mockStats = {
    days: 21,
    lessons: 5,
    activities: 14,
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };
  const handleIaInDevelopment = () => {
    setIaModalVisible(true);
  };
  const closeIaModal = () => setIaModalVisible(false);
  const handleStatPress = (type) => {
    const messages = {
      days: "Dias consecutivos aprendendo com a Linova.",
      lessons: "Total de aulas assistidas nesta semana.",
      activities: "Atividades práticas concluídas no app.",
    };
    setStatInfo(messages[type]);
  };
  const handleLevelInfo = () => {
    const description = Object.values(levelDescriptions).join("\n\n");
    setLevelInfo(description);
  };

  const handleThemeToggle = () => {
    setDarkMode((prev) => {
      if (prev === null) {
        return !isDarkMode;
      }
      return !prev;
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
      >
        <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.statPill} onPress={() => handleStatPress("days")} activeOpacity={0.8}>
            <Feather name="calendar" size={14} color="#FF6B5C" />
            <Text style={styles.statText}>{mockStats.days}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statPill} onPress={() => handleStatPress("lessons")} activeOpacity={0.8}>
            <Feather name="book" size={14} color="#3D7FFC" />
            <Text style={styles.statText}>{mockStats.lessons}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statPill} onPress={() => handleStatPress("activities")} activeOpacity={0.8}>
            <Feather name="check-circle" size={14} color="#FFB347" />
            <Text style={styles.statText}>{mockStats.activities}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.themeButton} onPress={handleThemeToggle} activeOpacity={0.8}>
            <Feather name={isDarkMode ? "sun" : "moon"} size={16} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.hero, { backgroundColor: theme.primary }]}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>Bem-vindo</Text>
              {displayName ? (
                <Text style={styles.welcome}>Ola, {displayName}!</Text>
              ) : (
                <Text style={styles.welcome}>
                  Ola, <Text style={styles.loadingDots}>...</Text>
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.levelPill} onPress={handleLevelInfo} activeOpacity={0.8}>
              <Feather name="star" size={16} color={theme.primary} />
              <Text style={styles.levelText}>{level || "Discoverer"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Continue de onde parou e desbloqueie novas aulas.</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroChip} activeOpacity={0.9} onPress={() => navigation.navigate("LessonList")}>
              <Feather name="book-open" size={16} color="#FFFFFF" />
              <Text style={styles.heroChipText}>Aulas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.heroChip, styles.heroChipGhost]} activeOpacity={0.9} onPress={handleIaInDevelopment}>
              <Feather name="message-circle" size={16} color="#FFFFFF" />
              <Text style={styles.heroChipText}>IA em breve</Text>
            </TouchableOpacity>
          </View>
        </View>

          <View style={styles.actions}>
            <CustomButton title="Ver aulas" onPress={() => navigation.navigate("LessonList")} />
            <CustomButton title="Conversacao IA (Em breve)" variant="ghost" onPress={handleIaInDevelopment} />
          </View>
        </View>
      </ScrollView>
      <Modal transparent animationType="fade" visible={isIaModalVisible || !!statInfo || !!levelInfo} onRequestClose={() => (statInfo ? setStatInfo(null) : levelInfo ? setLevelInfo(null) : closeIaModal())} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{statInfo ? "Seu progresso" : levelInfo ? level : "Funcao em desenvolvimento"}</Text>
            <Text style={styles.modalText}>{statInfo || levelInfo || "A Conversacao IA esta em desenvolvimento e ficara disponivel em breve."}</Text>
            <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={() => (statInfo ? setStatInfo(null) : levelInfo ? setLevelInfo(null) : closeIaModal())}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
      paddingHorizontal: spacing.layout,
      paddingVertical: spacing.layout,
      gap: spacing.lg,
      justifyContent: "flex-start",
    },
    scrollContent: {
      flexGrow: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    statPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statText: {
      color: colors.text,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
    },
    themeButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      marginLeft: "auto",
    },
    welcome: {
      fontSize: typography.heading + 2,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: typography.fonts.heading,
    },
    subtitle: {
      fontSize: typography.body,
      color: "#FFFFFF",
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
    heroLabel: {
      fontSize: typography.subheading,
      color: "#FFFFFF",
      fontFamily: typography.fonts.body,
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
      color: "#FFFFFF",
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
    loadingDots: {
      letterSpacing: 2,
    },
    actions: {
      gap: spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalCard: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontFamily: typography.fonts.heading,
      fontSize: typography.subheading,
      color: colors.text,
      fontWeight: "700",
    },
    modalText: {
      fontFamily: typography.fonts.body,
      fontSize: typography.body,
      color: colors.textSecondary,
    },
    modalButton: {
      alignSelf: "flex-end",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    modalButtonText: {
      color: colors.primary,
      fontSize: typography.body,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
    },
  });

export default HomeScreen;
