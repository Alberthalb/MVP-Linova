import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../navigation/AppNavigator";
import { colors, spacing, typography, radius } from "../../styles/theme";
import { getDisplayName } from "../../utils/userName";

const LoginScreen = ({ navigation }) => {
  const { setLevel, setUserName, userName, setUserEmail } = useContext(AppContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Campos obrigatorios", "Preencha email e senha para continuar.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLevel(null); // reset onboarding level for a fresh start
      const derivedName = getDisplayName(null, email, userName);
      setUserName(derivedName);
      setUserEmail(email);
      setLoading(false);
      navigation.replace("LevelQuiz");
    }, 400);
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
          <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroTop}>
              <Image source={require("../../../assets/Logotipo.png")} style={styles.logo} resizeMode="contain" />
              <View style={styles.badge}>
                <Feather name="zap" size={14} color={colors.background} />
                <Text style={styles.badgeText}>Beta</Text>
              </View>
            </View>
            <Text style={styles.title}>Bem-vindo a Linova</Text>
            <Text style={styles.subtitle}>Entre e continue sua jornada</Text>
          </LinearGradient>
          <View style={styles.card}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Feather name="mail" size={16} color={colors.muted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8A8A8A"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Senha</Text>
              <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.fieldAction}>Esqueci</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#8A8A8A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <CustomButton title="Entrar" onPress={handleLogin} loading={loading} />
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.footerLinkWrapper}>
            <Text style={styles.footerText}>Ainda nao tem uma conta? </Text>
            <Text style={[styles.footerText, styles.link]}>Cadastre-se.</Text>
          </TouchableOpacity>
          <Text style={styles.notice}>Aplicativo em versao de testes. Erros podem acontecer.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: typography.heading + 4,
    fontWeight: "700",
    color: colors.background,
    fontFamily: typography.fonts.heading,
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.subheading,
    color: "#E8EDFF",
    marginBottom: spacing.sm,
    fontFamily: typography.fonts.body,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    backgroundColor: colors.gray,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.text,
    fontFamily: typography.fonts.body,
  },
  linkWrapper: {
    alignSelf: "flex-end",
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
    fontFamily: typography.fonts.body,
  },
  footerLinkWrapper: {
    flexDirection: "row",
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.body,
    color: colors.text,
    fontFamily: typography.fonts.body,
  },
  notice: {
    marginTop: spacing.md,
    fontSize: typography.small,
    color: colors.muted,
    fontFamily: typography.fonts.body,
    textAlign: "center",
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    color: colors.text,
    fontFamily: typography.fonts.body,
    fontWeight: "600",
  },
  fieldAction: {
    color: colors.primary,
    fontWeight: "700",
  },
  heroTop: {
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
    color: colors.background,
    fontSize: typography.small,
    fontFamily: typography.fonts.body,
  },
});

export default LoginScreen;
