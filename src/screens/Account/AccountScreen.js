import React, { useContext, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Switch, Alert, TouchableOpacity, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../context/AppContext";
import { spacing, typography, radius } from "../../styles/theme";
import { getDisplayName } from "../../utils/userName";
import { useThemeColors } from "../../hooks/useThemeColors";

const AccountScreen = ({ navigation }) => {
  const { userName, setUserName, userEmail, setUserEmail, level, setLevel } = useContext(AppContext);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState(userName || "");
  const [email, setEmail] = useState(userEmail || "");
  const [notifications, setNotifications] = useState(true);
  const [autoSubs, setAutoSubs] = useState(true);
  const [statInfo, setStatInfo] = useState(null);

  const handleSaveProfile = () => {
    const display = getDisplayName(name, email, userName);
    setUserName(display);
    setUserEmail(email);
    Alert.alert("Perfil atualizado", "Seu nome e email foram atualizados (em desenvolvimento).");
  };

  const handleSummaryPress = (type) => {
    const messages = {
      days: "Dias consecutivos aprendendo com a Linova.",
      lessons: "Total de aulas assistidas nesta semana.",
      activities: "Atividades praticas concluidas no app.",
    };
    setStatInfo(messages[type]);
  };

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
          <CustomButton title="Salvar perfil" onPress={handleSaveProfile} />
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
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.prefTitle}>Legendas automáticas</Text>
              <Text style={styles.prefSubtitle}>Ativar ao iniciar os vídeos</Text>
            </View>
            <Switch value={autoSubs} onValueChange={setAutoSubs} trackColor={{ true: theme.primary }} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Nível atual</Text>
            <Feather name="award" size={16} color={theme.primary} />
          </View>
          <Text style={styles.levelValue}>{level || "Não definido"}</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setLevel(null);
              Alert.alert("Ok", "Reinicie o quiz inicial para recalcular o nível.");
            }}
          >
            <Text style={styles.linkButtonText}>Recalcular nível</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Resumo</Text>
            <Feather name="activity" size={16} color={theme.primary} />
          </View>
          <View style={styles.summaryRow}>
            <TouchableOpacity style={[styles.summaryTile, { borderColor: "#FF6B5C" }]} activeOpacity={0.85} onPress={() => handleSummaryPress("days")}>
              <Feather name="calendar" size={16} color="#FF6B5C" />
              <Text style={styles.summaryValue}>21 dias</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.summaryTile, { borderColor: "#3D7FFC" }]} activeOpacity={0.85} onPress={() => handleSummaryPress("lessons")}>
              <Feather name="book" size={16} color="#3D7FFC" />
              <Text style={styles.summaryValue}>5 aulas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.summaryTile, { borderColor: "#FFB347" }]} activeOpacity={0.85} onPress={() => handleSummaryPress("activities")}>
              <Feather name="check-circle" size={16} color="#FFB347" />
              <Text style={styles.summaryValue}>14 atividades</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.summaryHint}>Esses números refletem seu uso recente e ajudam a acompanhar seu progresso.</Text>
        </View>

        <CustomButton title="Alterar senha" variant="ghost" onPress={() => navigation.navigate("ChangePassword")} />
        <CustomButton title="Sair da conta" variant="ghost" onPress={() => Alert.alert("Logout", "Seu login será encerrado (em desenvolvimento).")} />
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
    levelValue: {
      fontSize: typography.subheading + 2,
      fontWeight: "700",
      color: colors.text,
      fontFamily: typography.fonts.heading,
    },
    linkButton: {
      paddingVertical: spacing.xs,
    },
    linkButtonText: {
      color: colors.primary,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.sm,
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
  });

export default AccountScreen;
