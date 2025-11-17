import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import { colors, typography } from "../../styles/theme";

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Login");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <LottieView style={styles.lottie} source={require("../../assets/animations/splash.json")} autoPlay loop />
      <Text style={styles.title}>Linova</Text>
      <Text style={styles.subtitle}>Aprenda idiomas com jornadas guiadas</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  lottie: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: typography.heading + 8,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 12,
  },
  subtitle: {
    fontSize: typography.subheading,
    color: colors.dark,
    marginTop: 4,
    textAlign: "center",
  },
});

export default SplashScreen;
