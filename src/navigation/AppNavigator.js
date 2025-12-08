import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { NavigationContainer, useNavigationState, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated, useColorScheme, StatusBar } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { typography, lightColors, darkColors } from "../styles/theme";
import { useThemeColors } from "../hooks/useThemeColors";
import useTabSwipeNavigation from "../hooks/useTabSwipeNavigation";
import { AppContext } from "../context/AppContext";
import { supabase } from "../services/supabase";
import { createOrUpdateUserProfile, getUserProfile } from "../services/userService";
import { getDisplayName } from "../utils/userName";
import { defaultSummaryStats } from "../utils/progressStats";
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
import ModuleListScreen from "../screens/Lessons/ModuleListScreen";
import ModuleAssessmentScreen from "../screens/Lessons/ModuleAssessmentScreen";
import TermsScreen from "../screens/Legal/TermsScreen";
import PrivacyScreen from "../screens/Legal/PrivacyScreen";
import AccountScreen from "../screens/Account/AccountScreen";
import ChangePasswordScreen from "../screens/Account/ChangePasswordScreen";
import SettingsScreen from "../screens/Settings/SettingsScreen";

const Stack = createNativeStackNavigator();
const AccountStackNavigator = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const TAB_ROUTE_ORDER = ["TabHome", "TabAccount", "TabSettings"];
const RESET_LINK_SCHEMES = ["linova", "https", "http", "exp", "exp+linova"];
const CACHE_KEYS = {
  modules: "linova:modules",
  moduleLessonCounts: "linova:moduleLessonCounts",
  lessonModuleMap: "linova:lessonModuleMap",
  progress: (uid) => `linova:user:${uid || "anon"}:progress`,
  unlocks: (uid) => `linova:user:${uid || "anon"}:unlocks`,
};

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="ModuleList" component={ModuleListScreen} />
    <Stack.Screen name="ModuleAssessment" component={ModuleAssessmentScreen} />
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

const summarizeProgress = (rows = []) => {
  const daysSet = new Set();
  let lessons = 0;
  let xp = 0;
  rows.forEach((entry) => {
    const score = Number.isFinite(entry?.score) ? entry.score : Number(entry?.score);
    const completed = entry?.completed === true || (Number.isFinite(score) && score >= 70);
    if (completed) {
      lessons += 1;
      xp += Number.isFinite(entry?.xp) ? entry.xp : 10;
      const ts = entry?.updated_at || entry?.updatedAt;
      let dateObj = null;
      if (ts instanceof Date) {
        dateObj = ts;
      } else if (ts?.toDate) {
        dateObj = ts.toDate();
      } else if (typeof ts === "string" || typeof ts === "number") {
        const d = new Date(ts);
        if (!Number.isNaN(d.getTime())) dateObj = d;
      }
      if (dateObj) {
        daysSet.add(dateObj.toISOString().slice(0, 10));
      }
    }
  });
  return { days: daysSet.size, lessons, activities: lessons, xp };
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
  const [userProfile, setUserProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [lessonsCompleted, setLessonsCompleted] = useState({});
  const [progressStats, setProgressStats] = useState(defaultSummaryStats);
  const [modules, setModules] = useState([]);
  const [moduleUnlocks, setModuleUnlocks] = useState({});
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [moduleLessonCounts, setModuleLessonCounts] = useState({});
  const [lessonModuleMap, setLessonModuleMap] = useState({});
  const systemScheme = useColorScheme();
  const isDark = darkMode === null ? systemScheme === "dark" : darkMode;
  const palette = isDark ? darkColors : lightColors;
  const prefetched = useRef(false);
  const cacheHydrated = useRef(false);
  const lastPrefetchedUserId = useRef(null);

  // Reseta preload e hidratação quando o usuário muda (logout/login)
  useEffect(() => {
    prefetched.current = false;
    cacheHydrated.current = false;
    lastPrefetchedUserId.current = currentUser?.id || null;
  }, [currentUser?.id]);

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
        const queryCode = parsed?.queryParams?.code || parsed?.queryParams?.access_token || parsed?.queryParams?.oobCode;
        if (queryCode) return queryCode;
        if (parsed?.fragment) {
          const params = new URLSearchParams(parsed.fragment.replace("#", ""));
          return params.get("code") || params.get("access_token") || params.get("oobCode");
        }
      } catch (error) {
        return null;
      }
      return null;
    };

    const handleUrl = (incomingUrl) => {
      if (!incomingUrl) return;
      const scheme = incomingUrl.split(":")[0]?.toLowerCase();
      if (scheme && !RESET_LINK_SCHEMES.includes(scheme)) {
        return;
      }
      const code = extractCode(incomingUrl);
      if (code) {
        navigateWithResetCode(code);
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => null);
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, []);

  const loadProfile = useCallback(
    async (user) => {
      if (!user?.id) {
        await clearUserCache(lastPrefetchedUserId.current || currentUser?.id || null);
        setUserEmail("");
        setUserName("Linova");
        setFullName("");
        setLevel(null);
        setLessonsCompleted({});
        setProgressStats(defaultSummaryStats);
        setModules([]);
        setModuleUnlocks({});
        setSelectedModuleId(null);
        setModuleLessonCounts({});
        setLessonModuleMap({});
        setUserProfile(null);
        return;
      }
      setUserEmail(user.email || "");
      let resolvedName = user.user_metadata?.name || fullName || userName || user.email || "";
      let profile = null;
      try {
        profile = await getUserProfile(user.id);
        setUserProfile(profile || null);
        if (profile?.name) {
          resolvedName = profile.name;
        }
        if (typeof profile?.level !== "undefined") {
          setLevel(profile.level);
        }
        if (profile?.currentModuleId || profile?.current_module_id) {
          setSelectedModuleId(profile.currentModuleId || profile.current_module_id);
        }
      } catch (error) {
        console.warn("[Auth] Falha ao carregar perfil:", error);
      }
      setFullName(resolvedName);
      setUserName(getDisplayName(resolvedName, user.email));
    },
    [fullName, setSelectedModuleId, userName]
  );

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setCurrentUser(data?.session?.user || null);
        await loadProfile(data?.session?.user);
        setAuthReady(true);
      }
    };
    init();
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        await clearUserCache(lastPrefetchedUserId.current || currentUser?.id || null);
      } else if (event === "USER_UPDATED" && lastPrefetchedUserId.current && session?.user?.id && session.user.id !== lastPrefetchedUserId.current) {
        await clearUserCache(lastPrefetchedUserId.current);
      }
      setCurrentUser(session?.user || null);
      await loadProfile(session?.user);
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [clearUserCache, currentUser?.id, loadProfile]);

  const clearUserCache = useCallback(
    async (uid) => {
      const userKey = uid || "anon";
      const keys = [CACHE_KEYS.progress(userKey), CACHE_KEYS.unlocks(userKey)];
      try {
        await AsyncStorage.multiRemove(keys);
        if (!uid) {
          await AsyncStorage.multiRemove([CACHE_KEYS.modules, CACHE_KEYS.moduleLessonCounts, CACHE_KEYS.lessonModuleMap]);
        }
      } catch (_err) {
        // ignore cache remove errors
      }
    },
    []
  );

  useEffect(() => {
    if (authReady && !cacheHydrated.current) {
      cacheHydrated.current = true;
      const hydrateFromCache = async () => {
        try {
          const userKey = currentUser?.id || "anon";
          const keys = [
            CACHE_KEYS.modules,
            CACHE_KEYS.moduleLessonCounts,
            CACHE_KEYS.lessonModuleMap,
            CACHE_KEYS.progress(userKey),
            CACHE_KEYS.unlocks(userKey),
          ];
          const entries = await AsyncStorage.multiGet(keys);
          entries.forEach(([key, value]) => {
            if (!value) return;
            try {
              const parsed = JSON.parse(value);
              if (key === CACHE_KEYS.modules && Array.isArray(parsed)) {
                setModules(parsed);
              } else if (key === CACHE_KEYS.moduleLessonCounts && parsed && typeof parsed === "object") {
                setModuleLessonCounts(parsed);
              } else if (key === CACHE_KEYS.lessonModuleMap && parsed && typeof parsed === "object") {
                setLessonModuleMap(parsed);
              } else if (key === CACHE_KEYS.progress(userKey) && parsed && typeof parsed === "object") {
                setLessonsCompleted(parsed);
                setProgressStats(summarizeProgress(Object.values(parsed)));
              } else if (key === CACHE_KEYS.unlocks(userKey) && parsed && typeof parsed === "object") {
                setModuleUnlocks(parsed);
              }
            } catch (_err) {
              // ignore cache parse errors
            }
          });
        } catch (error) {
          console.warn("[Cache] Falha ao hidratar dados locais:", error);
        }
      };
      hydrateFromCache();
    }
  }, [authReady, currentUser?.id]);

  useEffect(() => {
    if (!authReady || prefetched.current) return;
    if (lastPrefetchedUserId.current !== currentUser?.id) {
      prefetched.current = false;
    }
    if (prefetched.current) return;
    prefetched.current = true;
    lastPrefetchedUserId.current = currentUser?.id || null;
    const preload = async () => {
      try {
        const modulesPromise = supabase
          .from("modules")
          .select("id,title,description,level_tag,order")
          .order("order", { ascending: true });
        const lessonsPromise = supabase.from("lessons").select("id,module_id");
        const progressPromise = currentUser?.id
          ? supabase
              .from("user_lessons_completed")
              .select("lesson_id,score,completed,xp,watched,updated_at")
              .eq("user_id", currentUser.id)
          : Promise.resolve({ data: [] });
        const unlocksPromise = currentUser?.id
          ? supabase
              .from("user_module_unlocks")
              .select("module_id,status,passed,score,correctcount,totalquestions,reason,unlocked_at")
              .eq("user_id", currentUser.id)
          : Promise.resolve({ data: [] });

        const [modulesRes, lessonsRes, progressRes, unlocksRes] = await Promise.all([
          modulesPromise,
          lessonsPromise,
          progressPromise,
          unlocksPromise,
        ]);

        if (!modulesRes.error && modulesRes.data) {
          const list = (modulesRes.data || []).map((item, index) => ({
            id: item.id,
            title: item.title || `Módulo ${index + 1}`,
            description: item.description || "",
            levelTag: item.level_tag || item.levelTag || item.level || item.tag || null,
            order: item.order ?? index,
          }));
          setModules(list);
          AsyncStorage.setItem(CACHE_KEYS.modules, JSON.stringify(list)).catch(() => {});
        }

        if (!lessonsRes.error && lessonsRes.data) {
          const counts = {};
          const lessonToModule = {};
          (lessonsRes.data || []).forEach((row) => {
            const mId = row.module_id || null;
            counts[mId] = (counts[mId] || 0) + 1;
            if (row.id) {
              lessonToModule[row.id] = mId;
            }
          });
          setModuleLessonCounts(counts);
          setLessonModuleMap(lessonToModule);
          AsyncStorage.setItem(CACHE_KEYS.moduleLessonCounts, JSON.stringify(counts)).catch(() => {});
          AsyncStorage.setItem(CACHE_KEYS.lessonModuleMap, JSON.stringify(lessonToModule)).catch(() => {});
        }

        if (!progressRes.error && progressRes.data) {
          const map = {};
          (progressRes.data || []).forEach((row) => {
            map[row.lesson_id] = row;
          });
          setLessonsCompleted(map);
          setProgressStats(summarizeProgress(progressRes.data || []));
          AsyncStorage.setItem(CACHE_KEYS.progress(currentUser?.id), JSON.stringify(map)).catch(() => {});
        }

        if (!unlocksRes.error && unlocksRes.data) {
          const unlockMap = {};
          (unlocksRes.data || []).forEach((row) => {
            unlockMap[row.module_id] = row;
          });
          setModuleUnlocks(unlockMap);
          AsyncStorage.setItem(CACHE_KEYS.unlocks(currentUser?.id), JSON.stringify(unlockMap)).catch(() => {});
        }
      } catch (error) {
        console.warn("[Preload] Falha ao pré-carregar dados:", error);
      }
    };
    preload();
  }, [authReady, currentUser?.id]);

  useEffect(() => {
    // Modulos sao carregados no preload para evitar requisicoes duplicadas.
  }, [modules?.length]);

  useEffect(() => {
    if (selectedModuleId || !modules?.length) return;
    const profileModuleId = userProfile?.currentModuleId || userProfile?.current_module_id;
    const foundFromProfile = profileModuleId ? modules.find((item) => item.id === profileModuleId) : null;
    const fallback = modules[0];
    if (foundFromProfile) {
      setSelectedModuleId(foundFromProfile.id);
    } else if (fallback) {
      setSelectedModuleId(fallback.id);
    }
  }, [modules, selectedModuleId, userProfile?.currentModuleId, userProfile?.current_module_id]);

  useEffect(() => {
    if (!currentUser?.id) {
      setLessonsCompleted({});
      setProgressStats(defaultSummaryStats);
      return;
    }
    let active = true;
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from("user_lessons_completed")
        .select("lesson_id,score,completed,xp,updated_at,watched,answers")
        .eq("user_id", currentUser.id);
      if (error) {
        console.warn("[Progress] Falha ao carregar:", error);
        if (active) {
          setLessonsCompleted({});
          setProgressStats(defaultSummaryStats);
        }
        return;
      }
      if (!active) return;
      const map = {};
      (data || []).forEach((row) => {
        map[row.lesson_id] = row;
      });
      setLessonsCompleted(map);
      setProgressStats(summarizeProgress(data || []));
    };
    fetchProgress();
    const channel = supabase
      .channel(`user_lessons_completed:${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_lessons_completed", filter: `user_id=eq.${currentUser.id}` },
        fetchProgress
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) {
      setModuleUnlocks({});
      return;
    }
    let active = true;
    const fetchUnlocks = async () => {
      const { data, error } = await supabase
        .from("user_module_unlocks")
        .select("module_id,status,passed,score,correctcount,totalquestions,reason,unlocked_at")
        .eq("user_id", currentUser.id);
      if (error) {
        console.warn("[ModuleUnlocks] Falha ao carregar:", error);
        if (active) setModuleUnlocks({});
        return;
      }
      if (!active) return;
      const map = {};
      (data || []).forEach((row) => {
        map[row.module_id] = row;
      });
      setModuleUnlocks(map);
    };
    fetchUnlocks();
    const channel = supabase
      .channel(`user_module_unlocks:${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_module_unlocks", filter: `user_id=eq.${currentUser.id}` },
        fetchUnlocks
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

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
      lessonsCompleted,
      setLessonsCompleted,
      progressStats,
      setProgressStats,
      modules,
      moduleUnlocks,
      selectedModuleId,
      setSelectedModuleId,
      setModuleUnlocks,
      moduleLessonCounts,
      setModuleLessonCounts,
      lessonModuleMap,
      setLessonModuleMap,
    }),
    [
      level,
      userName,
      fullName,
      userEmail,
      darkMode,
      isDark,
      currentUser,
      authReady,
      lessonsCompleted,
      setLessonsCompleted,
      progressStats,
      setProgressStats,
      modules,
      moduleUnlocks,
      selectedModuleId,
      setSelectedModuleId,
      setModuleUnlocks,
      moduleLessonCounts,
      setModuleLessonCounts,
      lessonModuleMap,
      setLessonModuleMap,
    ]
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
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
};

export default AppNavigator;
