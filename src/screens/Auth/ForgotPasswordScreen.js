import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import { spacing, typography } from "../../styles/theme";
import { useThemeColors } from "../../hooks/useThemeColors";
import { sendPasswordRecovery } from "../../services/authService";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleReset = async () => {
    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail) {
      Alert.alert("Email obrigatório", "Informe seu email para recuperar a senha.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordRecovery(formattedEmail);
      Alert.alert("Verifique seu email", "Enviamos instruções para redefinir sua senha.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro ao enviar link", error?.message || "Não foi possível enviar o link de recuperação.");
    } finally {
      setLoading(false);
    }
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink} activeOpacity={0.7}>
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>Enviaremos um link para recuperar sua senha.</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8A8A8A"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <CustomButton title="Enviar link" onPress={handleReset} loading={loading} disabled={loading} />
          <TouchableOpacity style={styles.secondaryLink} disabled>
            <Text style={styles.secondaryText}>Já tenho um código (em desenvolvimento)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
      paddingVertical: spacing.layout,
      paddingBottom: spacing.layout * 1.5,
      justifyContent: "flex-start",
      gap: spacing.md,
    },
    backLink: {
      paddingRight: spacing.md,
      paddingVertical: spacing.xs,
    },
    backText: {
      color: colors.primary,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
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
    secondaryLink: {
      alignSelf: "center",
      marginTop: spacing.sm,
    },
    secondaryText: {
      color: colors.primary,
      fontFamily: typography.fonts.body,
      fontWeight: "600",
    },
  });

export default ForgotPasswordScreen;
