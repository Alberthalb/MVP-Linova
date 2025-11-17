import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import CustomButton from "../../components/CustomButton";
import { colors, spacing, typography } from "../../styles/theme";

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Campos obrigatorios", "Preencha todas as informacoes para criar sua conta.");
      return;
    }
    Alert.alert("Conta criada", "Login liberado com suas credenciais mockadas.");
    navigation.replace("Login");
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>Crie sua conta</Text>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Nome completo" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setEmail}
        />
        <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
        <CustomButton title="Cadastrar" onPress={handleRegister} />
      </View>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.footerLinkWrapper}>
        <Text style={styles.footerText}>Ja tem conta? </Text>
        <Text style={[styles.footerText, styles.link]}>Entrar</Text>
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
    fontSize: typography.heading + 2,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.lg,
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
  footerLinkWrapper: {
    flexDirection: "row",
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.body,
    color: colors.dark,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
});

export default RegisterScreen;