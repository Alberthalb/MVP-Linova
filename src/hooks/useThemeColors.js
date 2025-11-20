import { useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { colors as lightColors, darkColors } from "../styles/theme";

export const useThemeColors = () => {
  const { isDarkMode } = useContext(AppContext);
  return useMemo(() => (isDarkMode ? darkColors : lightColors), [isDarkMode]);
};

export const useIsDarkMode = () => {
  const { isDarkMode } = useContext(AppContext);
  return isDarkMode;
};
