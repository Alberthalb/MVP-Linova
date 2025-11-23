import React, { useMemo, useState, useEffect, useRef } from "react";
import { NavigationContainer, useNavigationState, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated, useColorScheme, StatusBar } from "react-native";
import * as Linking from "expo-linking";
import { typography, lightColors, darkColors } from "../styles/theme";
import { useThemeColors } from "../hooks/useThemeColors";
import useTabSwipeNavigation from "../hooks/useTabSwipeNavigation";
import { AppContext } from "../context/AppContext";
import { auth } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createOrUpdateUserProfile, getUserProfile } from "../services/userService";
import { getDisplayName } from "../utils/userName";
import SplashScreen from "../screens/Splash/SplashScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/Auth/ResetPasswordScreen";
import LevelQuizScreen from "../screens/Onboarding/LevelQuizScreen";
import WelcomeScreen from "../screens/Onboarding/WelcomeScreen";
import HomeScreen from "../screens/Home/HomeScreen";
import LessonListScreen from "../screens/Lessons/LessonListScreen";
import LessonScreen from "../screens/Lessons/LessonScreen";
import LessonQuizScreen from "../screens/Lessons/LessonQuizScreen";
import AccountScreen from "../screens/Account/AccountScreen";
import ChangePasswordScreen from "../screens/Account/ChangePasswordScreen";
import SettingsScreen from "../screens/Settings/SettingsScreen";

const Stack = createNativeStackNavigator();
const AccountStackNavigator = createNativeStackNavigator();
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

const AccountStack = () => (
  <AccountStackNavigator.Navigator
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
    }}
  >
    <AccountStackNavigator.Screen name="AccountMain" component={AccountScreen} />
    <AccountStackNavigator.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </AccountStackNavigator.Navigator>
);

const HomeTabScreen = withTabSwipe(HomeStack);
const AccountTabScreen = withTabSwipe(AccountStack);
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
          backgroundColor: theme.surface,
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
  const [fullName, setFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [darkMode, setDarkMode] = useState(null);
  const navigationRef = useRef(null);
  const pendingResetCode = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const systemScheme = useColorScheme();
  const isDark = darkMode === null ? systemScheme === "dark" : darkMode;
  const palette = isDark ? darkColors : lightColors;

  const navigateWithResetCode = (code) => {
    if (!code) return;
    if (navigationRef.current) {
      navigationRef.current.navigate("ResetPassword", { code });
    } else {
      pendingResetCode.current = code;
    }
  };

  useEffect(() => {
    const extractCode = (url) => {
      if (!url) return null;
      try {
        const parsed = Linking.parse(url);
        const queryCode = parsed?.queryParams?.oobCode || parsed?.queryParams?.oobcode;
        if (queryCode) return queryCode;
        if (parsed?.fragment) {
          const params = new URLSearchParams(parsed.fragment.replace("#", ""));
          return params.get("oobCode") || params.get("oobcode");
        }
      } catch (error) {
        return null;
      }
      return null;
    };

    const handleUrl = (incomingUrl) => {
      const code = extractCode(incomingUrl);
      if (code) {
        navigateWithResetCode(code);
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => null);
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setUserEmail(user.email || "");
        let resolvedName = user.displayName || "";
        try {
          const profile = await getUserProfile(user.uid);
          if (profile?.name) {
            resolvedName = profile.name;
          }
          if (typeof profile?.level !== "undefined") {
            setLevel(profile.level);
          }
          await createOrUpdateUserProfile(user.uid, {
            name: resolvedName,
            email: user.email || profile?.email || "",
          });
        } catch (error) {
          console.warn("[Auth] Falha ao carregar perfil:", error);
        }
        setFullName(resolvedName);
        setUserName(getDisplayName(resolvedName, user.email));
      } else {
        setUserEmail("");
        setUserName("Linova");
        setFullName("");
        setLevel(null);
      }
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const contextValue = useMemo(
    () => ({
      level,
      setLevel,
      userName,
      setUserName,
      fullName,
      setFullName,
      userEmail,
      setUserEmail,
      darkMode,
      setDarkMode,
      isDarkMode: isDark,
      currentUser,
      setCurrentUser,
      authReady,
    }),
    [level, userName, fullName, userEmail, darkMode, isDark, currentUser, authReady]
  );

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: palette.background,
        card: palette.surface,
        border: palette.border,
        text: palette.text,
        primary: palette.primary,
      },
    };
  }, [isDark, palette]);

  return (
    <AppContext.Provider value={contextValue}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={palette.background} />
      <NavigationContainer
        theme={navigationTheme}
        ref={navigationRef}
        onReady={() => {
          if (pendingResetCode.current) {
            navigateWithResetCode(pendingResetCode.current);
            pendingResetCode.current = null;
          }
        }}
      >
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="LevelQuiz" component={LevelQuizScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
};

export default AppNavigator;
