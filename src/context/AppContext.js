import { createContext } from "react";

export const AppContext = createContext({
  level: null,
  setLevel: () => {},
  userName: "Linova",
  setUserName: () => {},
  fullName: "",
  setFullName: () => {},
  userEmail: "",
  setUserEmail: () => {},
  darkMode: null,
  setDarkMode: () => {},
  isDarkMode: false,
  currentUser: null,
  setCurrentUser: () => {},
  authReady: false,
  lessonsCompleted: {},
  progressStats: { days: 0, lessons: 0, activities: 0 },
  modules: [],
  moduleUnlocks: {},
  selectedModuleId: null,
  setSelectedModuleId: () => {},
});
