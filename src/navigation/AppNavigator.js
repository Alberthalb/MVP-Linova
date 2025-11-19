import React, { useMemo, useState } from "react";
import { NavigationContainer, useNavigationState } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated, useColorScheme } from "react-native";
import { typography } from "../styles/theme";
import { useThemeColors } from "../hooks/useThemeColors";
import useTabSwipeNavigation from "../hooks/useTabSwipeNavigation";
import { AppContext } from "../context/AppContext";
import SplashScreen from "../screens/Splash/SplashScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import LevelQuizScreen from "../screens/Onboarding/LevelQuizScreen";
import HomeScreen from "../screens/Home/HomeScreen";
import LessonListScreen from "../screens/Lessons/LessonListScreen";
import LessonScreen from "../screens/Lessons/LessonScreen";
import LessonQuizScreen from "../screens/Lessons/LessonQuizScreen";
import AccountScreen from "../screens/Account/AccountScreen";
import SettingsScreen from "../screens/Settings/SettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const TAB_ROUTE_ORDER = ["TabHome", "TabAccount", "TabSettings"];

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="LessonList" component={LessonListScreen} />
    <Stack.Screen name="Lesson" component={LessonScreen} />
    <Stack.Screen name="LessonQuiz" component={LessonQuizScreen} />
  </Stack.Navigator>
);

const withTabSwipe = (Component) => {
  const SwipeableComponent = (props) => {
    const theme = useThemeColors();
    const navigationState = useNavigationState((state) => state);
    const isHomeTab = props.route?.name === "TabHome";
    let swipeEnabled = true;

    if (isHomeTab) {
      const homeRoute = navigationState?.routes?.find((route) => route.key === props.route?.key);
      const stackState = homeRoute?.state;
      const isAtRoot = !stackState || stackState.index === 0;
      swipeEnabled = isAtRoot;
    }

    const { panHandlers, animatedStyle } = useTabSwipeNavigation(TAB_ROUTE_ORDER, swipeEnabled);

    return (
      <Animated.View style={[{ flex: 1, backgroundColor: theme.background }, animatedStyle]} {...panHandlers}>
        <Component {...props} />
      </Animated.View>
    );
  };

  return SwipeableComponent;
};

const HomeTabScreen = withTabSwipe(HomeStack);
const AccountTabScreen = withTabSwipe(AccountScreen);
const SettingsTabScreen = withTabSwipe(SettingsScreen);

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);
  const theme = useThemeColors();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          height: 62 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 10,
          borderTopWidth: 0.5,
          borderTopColor: theme.border,
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === "TabHome") return <Feather name="home" size={size} color={color} />;
          if (route.name === "TabAccount") return <Feather name="user" size={size} color={color} />;
          return <Feather name="settings" size={size} color={color} />;
        },
        tabBarLabelStyle: { fontFamily: typography.fonts.body, fontSize: 12 },
      })}
    >
      <Tab.Screen name="TabHome" component={HomeTabScreen} options={{ tabBarLabel: "Home" }} />
      <Tab.Screen name="TabAccount" component={AccountTabScreen} options={{ tabBarLabel: "Conta" }} />
      <Tab.Screen name="TabSettings" component={SettingsTabScreen} options={{ tabBarLabel: "Config" }} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const [level, setLevel] = useState(null);
  const [userName, setUserName] = useState("Linova");
  const [userEmail, setUserEmail] = useState("");
  const [darkMode, setDarkMode] = useState(null);
  const systemScheme = useColorScheme();
  const isDark = darkMode === null ? systemScheme === "dark" : darkMode;

  const contextValue = useMemo(
    () => ({
      level,
      setLevel,
      userName,
      setUserName,
      userEmail,
      setUserEmail,
      darkMode,
      setDarkMode,
    }),
    [level, userName, userEmail, darkMode]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="LevelQuiz" component={LevelQuizScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
};

export default AppNavigator;
