import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import { spacing, typography, radius } from "../../styles/theme";
import { useThemeColors } from "../../hooks/useThemeColors";
import { changePassword } from "../../services/authService";

const ChangePasswordScreen = ({ navigation }) => {
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Campos obrigatórios", "Preencha todos os campos antes de continuar.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Senha muito curta", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Senhas diferentes", "Confirme a nova senha corretamente.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert("Senha atualizada", "Sua senha foi alterada com sucesso.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      Alert.alert("Não foi possível alterar", error?.message || "Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.heading}>Alterar senha</Text>
        <Text style={styles.subtitle}>Informe sua senha atual e crie uma nova senha.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Senha atual</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="********"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Nova senha</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="********"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Confirmar nova senha</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="********"
            autoCapitalize="none"
          />
          <CustomButton title="Atualizar senha" onPress={handleChangePassword} loading={loading} disabled={loading} />
        </View>
        <CustomButton title="Cancelar" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
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
      flex: 1,
      padding: spacing.layout,
      gap: spacing.lg,
    },
    heading: {
      fontSize: typography.heading + 2,
      fontFamily: typography.fonts.heading,
      color: colors.primary,
    },
    subtitle: {
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
      color: colors.text,
      fontFamily: typography.fonts.body,
    },
  });

export default ChangePasswordScreen;
