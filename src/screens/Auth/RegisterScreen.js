import React, { useContext, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { AppContext } from "../../context/AppContext";
import { getDisplayName } from "../../utils/userName";
import { useThemeColors } from "../../hooks/useThemeColors";
import { registerUser } from "../../services/authService";
import { getFirebaseAuthErrorMessage } from "../../utils/firebaseErrorMessage";

const RegisterScreen = ({ navigation }) => {
  const { setUserName, setUserEmail, setFullName } = useContext(AppContext);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || !password.trim()) {
      Alert.alert("Campos obrigatórios", "Preencha todas as informações para criar sua conta.");
      return;
    }
    if (!/^[\p{L} ]+$/u.test(trimmedName)) {
      Alert.alert("Nome inválido", "Use apenas letras e espaços no campo de nome.");
      return;
    }
    setLoading(true);
    try {
      await registerUser(trimmedName, trimmedEmail, password);
      const derivedName = getDisplayName(trimmedName, trimmedEmail);
      setUserName(derivedName);
      setFullName(trimmedName);
      setUserEmail(trimmedEmail);
      Alert.alert("Conta criada", "Vamos descobrir seu nível para personalizar o conteúdo.");
      navigation.replace("LevelQuiz");
    } catch (error) {
      Alert.alert("Erro ao cadastrar", getFirebaseAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          overScrollMode="always"
          bounces
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroRow}>
              <Image source={require("../../../assets/Logotipo Branco.png")} style={styles.logo} resizeMode="contain" />
              <View style={styles.badge}>
                <Feather name="award" size={14} color={theme.background} />
                <Text style={styles.badgeText}>Nova conta</Text>
              </View>
            </View>
            <Text style={styles.title}>Crie sua conta</Text>
            <Text style={styles.subtitle}>Avance para desbloquear o quiz inicial.</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Nome completo</Text>
            </View>
            <TextInput style={styles.input} placeholder="Nome completo" value={name} onChangeText={setName} />
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Email</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
            />
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Senha</Text>
            </View>
            <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
            <CustomButton title="Cadastrar" onPress={handleRegister} loading={loading} disabled={loading} />
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.footerLinkWrapper}>
            <Text style={styles.footerText}>Ja tem conta? </Text>
            <Text style={[styles.footerText, styles.link]}>Entrar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: spacing.layout,
      paddingVertical: spacing.layout,
      paddingBottom: spacing.layout * 1.5,
      justifyContent: "flex-start",
      gap: spacing.md,
    },
    hero: {
      gap: spacing.xs,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: theme.primary,
      marginBottom: spacing.lg,
      shadowColor: theme.cardShadow,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.accent,
    },
    title: {
      fontSize: typography.heading + 2,
      fontWeight: "700",
      color: theme.background,
      marginBottom: spacing.lg,
      fontFamily: typography.fonts.heading,
    },
    subtitle: {
      fontSize: typography.body,
      color: theme.overlay === "rgba(17,24,39,0.05)" ? "#E8EDFF" : theme.muted,
      marginTop: -spacing.sm,
      marginBottom: spacing.sm,
      fontFamily: typography.fonts.body,
    },
    logo: {
      width: 140,
      height: 40,
      marginBottom: spacing.xs,
    },
    card: {
      width: "100%",
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    input: {
      backgroundColor: theme.gray,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: typography.body,
      color: theme.text,
      fontFamily: typography.fonts.body,
    },
    footerLinkWrapper: {
      flexDirection: "row",
      marginTop: spacing.lg,
    },
    footerText: {
      fontSize: typography.body,
      color: theme.text,
      fontFamily: typography.fonts.body,
    },
    link: {
      color: theme.primary,
      fontWeight: "600",
      fontFamily: typography.fonts.body,
    },
    fieldHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    fieldLabel: {
      color: theme.text,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.15)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.sm,
    },
    badgeText: {
      color: theme.background,
      fontSize: typography.small,
      fontFamily: typography.fonts.body,
    },
  });

export default RegisterScreen;
