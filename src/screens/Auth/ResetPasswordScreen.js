import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { useThemeColors } from "../../hooks/useThemeColors";
import { applyPasswordReset, verifyResetCode } from "../../services/authService";
import * as Linking from "expo-linking";

const ResetPasswordScreen = ({ navigation, route }) => {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [code, setCode] = useState(route?.params?.code || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const extractCode = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes("code") || trimmed.includes("access_token")) {
      try {
        const parsed = Linking.parse(trimmed);
        const queryCode = parsed?.queryParams?.code || parsed?.queryParams?.access_token;
        if (queryCode) return queryCode;
        if (parsed?.fragment) {
          const params = new URLSearchParams(parsed.fragment.replace("#", ""));
          return params.get("code") || params.get("access_token") || trimmed;
        }
      } catch (error) {
        return trimmed;
      }
    }
    return trimmed;
  };

  useEffect(() => {
    if (route?.params?.code && route.params.code !== code) {
      setCode(route.params.code);
    }
  }, [route?.params?.code]);

  useEffect(() => {
    const normalized = extractCode(code);
    if (!normalized) {
      setEmail("");
      return;
    }
    const fetchEmail = async () => {
      try {
        const resultEmail = await verifyResetCode(normalized);
        setEmail(resultEmail);
      } catch (error) {
        setEmail("");
      }
    };
    fetchEmail();
  }, [code]);

  const handleSubmit = async () => {
    const trimmedCode = extractCode(code);
    if (!trimmedCode) {
      Alert.alert("Código obrigatório", "Cole o link completo do email ou digite o código recebido.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Senha inválida", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Senhas diferentes", "Digite a mesma senha nos dois campos.");
      return;
    }
    setLoading(true);
    try {
      const emailForCode = await verifyResetCode(trimmedCode);
      await applyPasswordReset(trimmedCode, newPassword);
      Alert.alert("Senha atualizada", `Senha redefinida para ${emailForCode || email}. Faça login novamente.`, [
        {
          text: "OK",
          onPress: () => navigation.reset({ index: 0, routes: [{ name: "Login" }] }),
        },
      ]);
    } catch (error) {
      Alert.alert("Não foi possível redefinir", error?.message || "Tente novamente com o link mais recente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Definir nova senha</Text>
        <Text style={styles.subtitle}>
          Abra o link recebido por email neste dispositivo. Detectamos automaticamente o código ou cole-o abaixo.
        </Text>
        {email ? <Text style={styles.info}>Recuperando acesso para: {email}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.label}>Código ou link completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Cole aqui o link recebido"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            multiline
            autoCorrect={false}
          />
          <Text style={styles.label}>Nova senha</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.label}>Confirmar nova senha</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <CustomButton title="Atualizar senha" onPress={handleSubmit} loading={loading} disabled={loading} />
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
      gap: spacing.md,
    },
    title: {
      fontSize: typography.heading,
      fontFamily: typography.fonts.heading,
      color: colors.primary,
    },
    subtitle: {
      fontSize: typography.body,
      fontFamily: typography.fonts.body,
      color: colors.muted,
    },
    info: {
      fontSize: typography.small,
      fontFamily: typography.fonts.body,
      color: colors.text,
    },
    card: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
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
      textAlignVertical: "top",
      minHeight: 48,
    },
  });

export default ResetPasswordScreen;
