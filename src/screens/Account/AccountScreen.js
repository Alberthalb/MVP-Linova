import React, { useContext, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Switch, Alert, TouchableOpacity, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../context/AppContext";
import { spacing, typography, radius } from "../../styles/theme";
import { getDisplayName } from "../../utils/userName";
import { useThemeColors } from "../../hooks/useThemeColors";
import { logoutUser, deleteAccount } from "../../services/authService";
import { createOrUpdateUserProfile, getUserProfile } from "../../services/userService";
import { supabase } from "../../services/supabase";
import { defaultSummaryStats } from "../../utils/progressStats";

const AccountScreen = ({ navigation }) => {
  const {
    userName,
    setUserName,
    fullName,
    setFullName,
    userEmail,
    setUserEmail,
    progressStats,
    lessonsCompleted = {},
    currentUser,
    setLessonsCompleted,
    setProgressStats,
    setModuleLessonCounts,
    setModuleUnlocks,
    setSelectedModuleId,
    setLevel,
  } = useContext(AppContext);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState(fullName || userName || "");
  const [email, setEmail] = useState(userEmail || "");
  const [notifications, setNotifications] = useState(true);
  const [statInfo, setStatInfo] = useState(null);
  const [profileInfo, setProfileInfo] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const summaryStats = progressStats || defaultSummaryStats;

  const completedLessonsWithActivity = useMemo(() => {
    let count = 0;
    Object.values(lessonsCompleted || {}).forEach((entry) => {
      const score = Number.isFinite(entry?.score) ? entry.score : Number(entry?.score);
      const completed = entry?.completed === true;
      if (completed || (Number.isFinite(score) && score >= 70)) {
        count += 1;
      }
    });
    return count;
  }, [lessonsCompleted]);

  const streakDays = useMemo(() => {
    const daysSet = new Set();
    Object.values(lessonsCompleted || {}).forEach((entry) => {
      const score = Number.isFinite(entry?.score) ? entry.score : Number(entry?.score);
      const watched = entry?.watched === true;
      const studied = watched || (Number.isFinite(score) && score > 0);
      if (!studied) return;
      const ts = entry?.updatedAt || entry?.updated_at;
      let dateObj = null;
      if (ts?.toDate) {
        dateObj = ts.toDate();
      } else if (typeof ts === "number") {
        dateObj = new Date(ts);
      } else if (typeof ts === "string") {
        dateObj = new Date(ts);
      }
      if (dateObj && !Number.isNaN(dateObj.getTime())) {
        daysSet.add(dateObj.toISOString().slice(0, 10));
      }
    });
    return daysSet.size || summaryStats.days || 0;
  }, [lessonsCompleted, summaryStats.days]);

  const forceReauth = async () => {
    try {
      await logoutUser();
    } catch (error) {
      // ignore logout errors, will navigate anyway
    }
    const rootNavigator = navigation.getParent()?.getParent();
    rootNavigator?.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const executeProfileSave = async (trimmedName, trimmedEmail) => {
    setSavingProfile(true);
    try {
      // Garante o user_id para sincronizar user_profiles (tabela) e depois atualiza Auth
      let uid = currentUser?.id || null;
      if (!uid) {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        uid = data?.user?.id || null;
      }
      if (!uid) throw new Error("Usuario nao autenticado");

      // 1) Atualiza tabela
      await createOrUpdateUserProfile(uid, { name: trimmedName, email: trimmedEmail });

      // 2) Atualiza Auth (gera fluxo de confirmacao). Se demorar, segue mesmo assim.
      let authUpdateError = null;
      const authPromise = supabase.auth.updateUser({
        email: trimmedEmail,
        data: { name: trimmedName, email: trimmedEmail },
      });
      const authResult = await Promise.race([
        authPromise,
        new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 6000)),
      ]);
      if (authResult?.error) {
        authUpdateError = authResult.error;
      }

      setFullName(trimmedName);
      setUserName(getDisplayName(trimmedName, trimmedEmail));
      setUserEmail(trimmedEmail);
      setProfileInfo(
        authUpdateError
          ? `Perfil atualizado. Verifique seu email para confirmar a alteracao. (Login nao atualizado: ${authUpdateError.message || "tente novamente"})`
          : "Perfil atualizado. Verifique seu email para confirmar a alteracao de login (email/usuario)."
      );
    } catch (error) {
      if (error?.message?.toLowerCase()?.includes("reauth")) {
        Alert.alert("Refaca o login", "Por seguranca, faca login novamente para alterar o email.", [
          { text: "Cancelar" },
          { text: "Fazer login", onPress: forceReauth },
        ]);
      } else {
        const message = error?.message || "Não foi possível atualizar seu perfil.";
        console.warn("[Account] Falha ao salvar perfil:", error);
        Alert.alert("Erro ao atualizar", message);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      Alert.alert("Campos obrigatorios", "Preencha nome e email.");
      return;
    }
    if (!/^[\p{L} ]+$/u.test(trimmedName)) {
      Alert.alert("Nome invalido", "Use apenas letras e espacos.");
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert("Email invalido", "Verifique o formato do email.");
      return;
    }
    Alert.alert(
      "Confirmar alteracao",
      `Salvar novo nome/email?\n\nNome: ${trimmedName}\nEmail: ${trimmedEmail}`,
      [
        { text: "Cancelar" },
        { text: "Confirmar", onPress: () => executeProfileSave(trimmedName, trimmedEmail) },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      const rootNavigator = navigation.getParent()?.getParent();
      rootNavigator?.reset({ index: 0, routes: [{ name: "Welcome" }] });
    } catch (error) {
      Alert.alert("Erro ao sair", error?.message || "Não foi possível sair.");
    }
  };

  const handleDeleteAccount = () => {
    setDeletePassword("");
    setDeleteConfirm("");
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    const confirmationText = deleteConfirm.trim().toUpperCase();
    if (!deletePassword.trim()) {
      Alert.alert("Senha obrigatória", "Informe sua senha para prosseguir.");
      return;
    }
    if (confirmationText !== "EXCLUIR") {
      Alert.alert('Confirme digitando "EXCLUIR"', 'Digite "EXCLUIR" no campo de confirmação para continuar.');
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword.trim());
      try {
        await logoutUser();
      } catch (_) {
        // ignore logout errors
      }
      const cacheKeys = [
        "linova:modules",
        "linova:moduleLessonCounts",
        `linova:user:${currentUser?.id || "anon"}:progress`,
        `linova:user:${currentUser?.id || "anon"}:unlocks`,
      ];
      AsyncStorage.multiRemove(cacheKeys).catch(() => {});
      setUserEmail("");
      setUserName("Linova");
      setFullName("");
      setLevel(null);
      setLessonsCompleted({});
      setProgressStats(defaultSummaryStats);
      setModuleLessonCounts({});
      setModuleUnlocks({});
      setSelectedModuleId(null);
      const rootNavigator = navigation.getParent()?.getParent();
      rootNavigator?.reset({ index: 0, routes: [{ name: "Welcome" }] });
    } catch (error) {
      const message =
        error?.message?.toLowerCase()?.includes("invalid login")
          ? "Senha inválida"
          : error?.message || "Não foi possível excluir sua conta.";
      Alert.alert("Erro ao excluir", message);
    } finally {
      setDeleteLoading(false);
      setDeleteModalVisible(false);
    }
  };

  const handleSummaryPress = (type) => {
    const messages = {
      days: `Dias em que você estudou: ${streakDays}.`,
      lessons: `Aulas concluídas (com atividades): ${completedLessonsWithActivity}.`,
      xp: `Pontos acumulados: ${summaryStats.xp || 0}. Cada aula vale 10 pontos.`,
    };
    setStatInfo(messages[type]);
  };

  useEffect(() => {
    setName(fullName || userName || "");
  }, [fullName, userName]);

  useEffect(() => {
    setEmail(userEmail || "");
  }, [userEmail]);

  useEffect(() => {
    const refreshProfile = async () => {
      const uid = currentUser?.id;
      if (!uid) return;
      try {
        const profile = await getUserProfile(uid);
        if (profile?.name) {
          setFullName(profile.name);
          setUserName(getDisplayName(profile.name, profile.email || userEmail));
          setName(profile.name);
        }
        if (profile?.email) {
          setUserEmail(profile.email);
          setEmail(profile.email);
        }
      } catch (error) {
        console.warn("[Account] Falha ao carregar perfil:", error);
      }
    };
    refreshProfile();
  }, [currentUser?.id, setFullName, setUserName, setUserEmail]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Conta</Text>
        <Text style={styles.subheading}>Gerencie seu perfil, preferências e resumo.</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Perfil</Text>
            <Feather name="user" size={16} color={theme.primary} />
          </View>
          <Text style={styles.label}>Nome</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Seu nome" />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Seu email" autoCapitalize="none" />
          <CustomButton title="Salvar perfil" onPress={handleSaveProfile} loading={savingProfile} disabled={savingProfile} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Preferências</Text>
            <Feather name="sliders" size={16} color={theme.primary} />
          </View>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.prefTitle}>Notificações</Text>
              <Text style={styles.prefSubtitle}>Lembretes e novidades{"\n"}(em desenvolvimento)</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: theme.primary }} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Resumo</Text>
            <Feather name="activity" size={16} color={theme.primary} />
          </View>
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={[styles.summaryTile, { borderColor: "#3D7FFC" }]}
              activeOpacity={0.85}
              onPress={() => handleSummaryPress("lessons")}
            >
              <Feather name="book" size={16} color="#3D7FFC" />
              <Text style={styles.summaryValue}>{completedLessonsWithActivity} aulas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.summaryTile, { borderColor: "#FFB347" }]}
              activeOpacity={0.85}
              onPress={() => handleSummaryPress("days")}
            >
              <Feather name="sunrise" size={16} color="#FFB347" />
              <Text style={styles.summaryValue}>{streakDays} dias</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.summaryTile, { borderColor: "#8B5CF6" }]}
              activeOpacity={0.85}
              onPress={() => handleSummaryPress("xp")}
            >
              <Feather name="star" size={16} color="#8B5CF6" />
              <Text style={styles.summaryValue}>{summaryStats.xp || 0} pontos</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.summaryHint}>Esses números refletem seu uso recente e ajudam a acompanhar seu progresso.</Text>
        </View>

        <CustomButton title="Alterar senha" variant="ghost" onPress={() => navigation.navigate("ChangePassword")} />
        <CustomButton title="Sair da conta" variant="ghost" onPress={handleLogout} />
        <CustomButton title={deleteLoading ? "Excluindo..." : "Excluir conta"} variant="ghost" onPress={handleDeleteAccount} disabled={deleteLoading} />
      </ScrollView>
      <Modal transparent animationType="fade" visible={!!statInfo} onRequestClose={() => setStatInfo(null)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Seu progresso</Text>
            <Text style={styles.modalText}>{statInfo}</Text>
            <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={() => setStatInfo(null)}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal transparent animationType="fade" visible={!!profileInfo} onRequestClose={() => setProfileInfo(null)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Perfil atualizado</Text>
            <Text style={styles.modalText}>{profileInfo}</Text>
            <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={() => setProfileInfo(null)}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        animationType="fade"
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Excluir conta</Text>
            <Text style={styles.modalText}>Essa acao é permanente. Digite sua senha e escreva EXCLUIR para confirmar.</Text>
            <TextInput
              style={styles.modalInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Sua senha"
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={styles.modalInput}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder='Digite "EXCLUIR" para confirmar'
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={[styles.modalActionButton, styles.modalActionGhost]}
                activeOpacity={0.8}
                disabled={deleteLoading}
              >
                <Text style={[styles.modalActionText, styles.modalActionGhostText]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeleteAccount}
                style={styles.modalActionButton}
                activeOpacity={0.9}
                disabled={deleteLoading}
              >
                <Text style={styles.modalActionText}>{deleteLoading ? "Excluindo..." : "Excluir"}</Text>
              </TouchableOpacity>
            </View>
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
      flexGrow: 1,
      paddingHorizontal: spacing.layout,
      paddingTop: spacing.layout,
      paddingBottom: spacing.md,
      gap: spacing.lg,
    },
    heading: {
      fontSize: typography.heading + 2,
      fontFamily: typography.fonts.heading,
      color: colors.primary,
    },
    subheading: {
      fontSize: typography.body,
      fontFamily: typography.fonts.body,
      color: colors.muted,
    },
    card: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
      shadowColor: colors.cardShadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardTitle: {
      fontSize: typography.subheading + 1,
      fontWeight: "700",
      color: colors.text,
      fontFamily: typography.fonts.heading,
    },
    label: {
      color: colors.muted,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
    input: {
      backgroundColor: colors.gray,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: typography.body,
      color: colors.text,
      fontFamily: typography.fonts.body,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.xs,
      gap: spacing.md,
    },
    rowText: {
      flex: 1,
    },
    prefTitle: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
      fontFamily: typography.fonts.body,
    },
    prefSubtitle: {
      color: colors.muted,
      fontFamily: typography.fonts.body,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.sm,
      flexWrap: "wrap",
    },
    summaryTile: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryValue: {
      marginTop: spacing.xs,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
      color: colors.text,
    },
    summaryHint: {
      color: colors.muted,
      fontFamily: typography.fonts.body,
      fontSize: typography.small,
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
      color: colors.muted,
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
    modalInput: {
      backgroundColor: colors.gray,
      borderRadius: radius.md,
      padding: spacing.md,
      fontFamily: typography.fonts.body,
      color: colors.text,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    modalActionButton: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    modalActionGhost: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.accent,
    },
    modalActionText: {
      color: colors.surface,
      fontFamily: typography.fonts.button,
      fontWeight: "600",
    },
    modalActionGhostText: {
      color: colors.accent,
    },
  });

export default AccountScreen;
