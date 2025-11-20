import { createContext } from "react";

export const AppContext = createContext({
  level: null,
  setLevel: () => {},
  userName: "Linova",
  setUserName: () => {},
  userEmail: "",
  setUserEmail: () => {},
  darkMode: null,
  setDarkMode: () => {},
  isDarkMode: false,
});
