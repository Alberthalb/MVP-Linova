import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        overScrollMode="always"
        bounces
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
    justifyContent: "flex-start",
    gap: spacing.md,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: typography.fonts.heading,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.muted,
    fontFamily: typography.fonts.body,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.gray,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.text,
    fontFamily: typography.fonts.body,
  },
});

export default ForgotPasswordScreen;
