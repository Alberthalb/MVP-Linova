import "react-native-gesture-handler";
import React from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { useFonts, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Inter_400Regular } from "@expo-google-fonts/inter";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "./src/styles/theme";

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Inter_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
