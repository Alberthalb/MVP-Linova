import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import CustomButton from "../../components/CustomButton";
import { AppContext } from "../../navigation/AppNavigator";
import { colors, spacing, typography } from "../../styles/theme";

const LoginScreen = ({ navigation }) => {
  const { setLevel } = useContext(AppContext);
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
      setLoading(false);
      navigation.replace("LevelQuiz");
    }, 400);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>Bem-vindo a Linova</Text>
      <Text style={styles.subtitle}>Entre para continuar sua jornada</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8A8A8A"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#8A8A8A"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <CustomButton title="Entrar" onPress={handleLogin} loading={loading} />
        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={styles.linkWrapper}>
          <Text style={styles.link}>Esqueci minha senha</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.footerLinkWrapper}>
        <Text style={styles.footerText}>Novo por aqui? </Text>
        <Text style={[styles.footerText, styles.link]}>Crie sua conta</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.heading + 4,
    fontWeight: "700",
    color: colors.primary,
  },
  subtitle: {
    fontSize: typography.subheading,
    color: colors.dark,
    marginBottom: spacing.xl,
  },
  card: {
    width: "100%",
    backgroundColor: colors.light,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.gray,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.dark,
  },
  linkWrapper: {
    alignSelf: "flex-end",
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
  footerLinkWrapper: {
    flexDirection: "row",
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.body,
    color: colors.dark,
  },
});

export default LoginScreen;
