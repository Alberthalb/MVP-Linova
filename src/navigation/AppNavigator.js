import React, { createContext, useMemo, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
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

export const AppContext = createContext({
  level: null,
  setLevel: () => {},
  userName: "Linova",
  setUserName: () => {},
  userEmail: "",
  setUserEmail: () => {},
});

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const [level, setLevel] = useState(null);
  const [userName, setUserName] = useState("Linova");
  const [userEmail, setUserEmail] = useState("");

  const contextValue = useMemo(
    () => ({
      level,
      setLevel,
      userName,
      setUserName,
      userEmail,
      setUserEmail,
    }),
    [level, userName, userEmail]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="LevelQuiz" component={LevelQuizScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="LessonList" component={LessonListScreen} />
          <Stack.Screen name="Lesson" component={LessonScreen} />
          <Stack.Screen name="LessonQuiz" component={LessonQuizScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
};

export default AppNavigator;
