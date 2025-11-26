import React, { useContext, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from "react-native";
import { SvgUri } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../context/AppContext";
import { spacing, typography, radius } from "../../styles/theme";
import { getDisplayName } from "../../utils/userName";
import { useThemeColors } from "../../hooks/useThemeColors";
import { loginUser } from "../../services/authService";
import { getFirebaseAuthErrorMessage } from "../../utils/firebaseErrorMessage";

const LoginScreen = ({ navigation }) => {
  const { setLevel, setUserName, userName, setUserEmail, currentUser, authReady } = useContext(AppContext);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleLogin = async () => {
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      const remaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));
      Alert.alert("Aguarde", `Muitas tentativas. Tente novamente em ${remaining}s.`);
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert("Campos obrigatórios", "Preencha email e senha para continuar.");
      return;
    }
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Email inválido", "Verifique o formato do email.");
      return;
    }
    setLoading(true);
    try {
      await loginUser(email.trim(), password);
      const derivedName = getDisplayName(null, email, userName);
      setUserName(derivedName);
      setUserEmail(email);
      setLevel(null);
      setFailedAttempts(0);
      setLockUntil(null);
      navigation.replace("MainTabs");
    } catch (error) {
      const attempts = failedAttempts + 1;
      const shouldLock = attempts >= 5;
      if (shouldLock) {
        setLockUntil(Date.now() + 60 * 1000);
        setFailedAttempts(0);
      } else {
        setFailedAttempts(attempts);
      }
      Alert.alert("Erro ao entrar", getFirebaseAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailStep = () => {
    if (!email.trim()) {
      Alert.alert("Informe seu email", "Precisamos saber seu email para continuar.");
      return;
    }
    setStep(2);
  };

  const isEmailStep = step === 1;
  const nextArrowUri = Image.resolveAssetSource(require("../../../assets/next.svg")).uri;
  const eyeOpenUri = Image.resolveAssetSource(require("../../../assets/open-eye.svg")).uri;
  const eyeClosedUri = Image.resolveAssetSource(require("../../../assets/close-eye.svg")).uri;
  const svgTint = "rgba(17,24,39,0.75)";
  const arrowColor = theme.accent;

  const showSkip = authReady && currentUser;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.container}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
            {showSkip && (
              <TouchableOpacity style={styles.skipLink} onPress={() => navigation.replace("MainTabs")} activeOpacity={0.7}>
                <Text style={styles.skipText}>Ir para o app</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.content}>
            <View style={styles.logoWrapper}>
              <Image source={require("../../../assets/brand-logo.png")} style={styles.logo} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.welcome}>Bem-vindo de volta!</Text>
              <Text style={styles.title}>Entrar na sua conta</Text>
              <Text style={styles.subtitle}>
                {isEmailStep ? "Informe seu email para continuar de onde parou." : `Email informado: ${email}`}
              </Text>
            </View>
            {isEmailStep ? (
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Email"
                  placeholderTextColor={theme.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleEmailStep}
                />
                <TouchableOpacity style={styles.advanceButton} onPress={handleEmailStep} activeOpacity={0.8}>
                  <SvgUri width={22} height={22} uri={nextArrowUri} fill={arrowColor} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.passwordPanel}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.flex]}
                    placeholder="Senha"
                    placeholderTextColor={theme.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} activeOpacity={0.7}>
                    <SvgUri width={24} height={24} uri={showPassword ? eyeOpenUri : eyeClosedUri} fill={svgTint} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} activeOpacity={0.7}>
                  <Text style={styles.link}>Esqueci minha senha</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.steps}>
              <View style={[styles.dot, isEmailStep && styles.dotActive]} />
              <View style={[styles.dot, !isEmailStep && styles.dotActive]} />
            </View>
            {!isEmailStep && (
              <CustomButton
                title="Entrar"
                onPress={handleLogin}
                loading={loading}
                style={styles.primaryButton}
                containerStyle={styles.primaryButtonContainer}
              />
            )}
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.secondaryLink}>
            <Text style={styles.secondaryText}>Criar nova conta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    welcome: {
      fontSize: typography.body,
      color: theme.primary,
      fontFamily: typography.fonts.body,
      fontWeight: "700",
      textAlign: "center",
    },
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: spacing.layout,
      paddingVertical: spacing.lg,
      justifyContent: "space-between",
      alignItems: "stretch",
      gap: spacing.md,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    backLink: {
      alignSelf: "flex-start",
    },
    backText: {
      color: theme.primary,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
    skipLink: {
      alignSelf: "flex-end",
      marginBottom: spacing.sm,
    },
    content: {
      flex: 1,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
    },
    skipText: {
      color: theme.muted,
      fontFamily: typography.fonts.body,
      fontSize: typography.small,
      textDecorationLine: "underline",
    },
    logoWrapper: {
      alignItems: "center",
    },
    logo: {
      width: 120,
      height: 120,
    },
    headerText: {
      alignItems: "center",
      gap: spacing.xs,
    },
    title: {
      fontSize: typography.heading + 2,
      fontFamily: typography.fonts.heading,
      color: theme.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: typography.body,
      color: theme.textSecondary,
      textAlign: "center",
      fontFamily: typography.fonts.body,
      lineHeight: 20,
      maxWidth: 250,
    },
    input: {
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      fontSize: typography.body,
      color: theme.text,
      fontFamily: typography.fonts.body,
      backgroundColor: "transparent",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: theme.surface,
      paddingHorizontal: spacing.md,
      borderRadius: radius.xl,
      height: 52,
      alignSelf: "stretch",
    },
    inputIcon: {
      marginRight: spacing.xs,
    },
    advanceButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    passwordPanel: {
      width: "100%",
      gap: spacing.sm,
    },
    link: {
      color: theme.primary,
      fontWeight: "600",
      fontFamily: typography.fonts.body,
      alignSelf: "flex-end",
    },
    primaryButton: {
      width: "100%",
    },
    primaryButtonContainer: {
      width: "100%",
      alignSelf: "stretch",
    },
    steps: {
      flexDirection: "row",
      gap: spacing.xs,
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "center",
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.gray,
    },
    dotActive: {
      backgroundColor: theme.primary,
    },
    secondaryLink: {
      alignSelf: "center",
      marginTop: spacing.lg,
    },
    secondaryText: {
      color: theme.primary,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
  });

export default LoginScreen;
