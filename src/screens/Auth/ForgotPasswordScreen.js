import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert } from "react-native";
import CustomButton from "../../components/CustomButton";
import { colors, spacing, typography } from "../../styles/theme";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");

  const handleReset = () => {
    if (!email.trim()) {
      Alert.alert("Email obrigatorio", "Informe seu email para recuperar a senha.");
      return;
    }
    Alert.alert("Link enviado", "Verifique seu email para redefinir a senha (mock).");
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar senha</Text>
      <Text style={styles.subtitle}>Enviaremos um link para recuperacao (mock).</Text>
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
        <CustomButton title="Enviar link" onPress={handleReset} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: "700",
    color: colors.primary,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.dark,
  },
  card: {
    backgroundColor: colors.light,
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.gray,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.dark,
  },
});

export default ForgotPasswordScreen;