import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, Switch, Alert, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../navigation/AppNavigator";
import { colors, spacing, typography, radius } from "../../styles/theme";
import { getDisplayName } from "../../utils/userName";

const STORAGE_KEY = "@linova:lessonProgress";

const AccountScreen = () => {
  const { userName, setUserName, userEmail, setUserEmail, level, setLevel } = useContext(AppContext);
  const [name, setName] = useState(userName || "");
  const [email, setEmail] = useState(userEmail || "");
  const [notifications, setNotifications] = useState(true);
  const [autoSubs, setAutoSubs] = useState(true);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setProgress([]);
        return;
      }
      const parsed = JSON.parse(stored);
      const list = Object.keys(parsed).map((id) => ({
        id,
        title: parsed[id].lessonTitle || `Aula ${id}`,
        score: parsed[id].score,
      }));
      setProgress(list);
    } catch {
      setProgress([]);
    }
  };

  const handleSaveProfile = () => {
    const display = getDisplayName(name, email, userName);
    setUserName(display);
    setUserEmail(email);
    Alert.alert("Perfil atualizado", "Seu nome e email foram atualizados (mock).");
  };

  const handleClearProgress = async () => {
    Alert.alert("Limpar progresso", "Deseja apagar os resultados dos quizzes?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setProgress([]);
          Alert.alert("Pronto", "Progresso local apagado.");
        },
      },
    ]);
  };

  const renderProgressItem = ({ item }) => (
    <View style={styles.progressItem}>
      <View style={{ gap: spacing.xs }}>
        <Text style={styles.progressTitle}>{item.title}</Text>
        <Text style={styles.progressScore}>Score: {item.score}%</Text>
      </View>
      <Feather name="check-circle" size={20} color={colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Conta</Text>
        <Text style={styles.subheading}>Gerencie seu perfil, preferências e progresso.</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Perfil</Text>
            <Feather name="user" size={16} color={colors.primary} />
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
            <Feather name="sliders" size={16} color={colors.primary} />
          </View>
          <View style={styles.row}>
            <View>
              <Text style={styles.prefTitle}>Notificações</Text>
              <Text style={styles.prefSubtitle}>Lembretes e novidades (mock)</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: colors.primary }} />
          </View>
          <View style={styles.row}>
            <View>
              <Text style={styles.prefTitle}>Legendas automáticas</Text>
              <Text style={styles.prefSubtitle}>Ativar ao iniciar os vídeos</Text>
            </View>
            <Switch value={autoSubs} onValueChange={setAutoSubs} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Progresso</Text>
            <Feather name="bar-chart-2" size={16} color={colors.primary} />
          </View>
          {progress.length === 0 ? (
            <Text style={styles.empty}>Nenhum quiz salvo ainda.</Text>
          ) : (
            <FlatList data={progress} renderItem={renderProgressItem} keyExtractor={(item) => item.id.toString()} />
          )}
          <TouchableOpacity style={styles.linkButton} onPress={handleClearProgress}>
            <Text style={styles.linkButtonText}>Limpar progresso</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Nível atual</Text>
            <Feather name="award" size={16} color={colors.primary} />
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
    flexGrow: 1,
    paddingHorizontal: spacing.layout,
    paddingVertical: spacing.layout,
    paddingBottom: spacing.layout * 1.5,
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
  empty: {
    color: colors.muted,
    fontFamily: typography.fonts.body,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  progressTitle: {
    fontFamily: typography.fonts.body,
    color: colors.text,
    fontWeight: "600",
  },
  progressScore: {
    color: colors.muted,
    fontFamily: typography.fonts.body,
  },
  linkButton: {
    paddingVertical: spacing.xs,
  },
  linkButtonText: {
    color: colors.primary,
    fontFamily: typography.fonts.body,
    fontWeight: "700",
  },
  levelValue: {
    fontSize: typography.subheading + 2,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.fonts.heading,
  },
});

export default AccountScreen;
