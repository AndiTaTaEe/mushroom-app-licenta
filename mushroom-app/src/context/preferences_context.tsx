import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// define the dynamic color palette based on the state of dark mode
export const Colors = {
  dark: {
    background: "#0F172A",
    card: "#1E293B",
    text: "#F8FAFC",
    subtext: "#94A3B8",
    border: "#334155",
    icon: "#94A3B8",
    primary: "#10B981",
  },
  light: {
    background: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0F172A",
    subtext: "#64748B",
    border: "#F1F5F9",
    icon: "#64748B",
    primary: "#10B981",
  },
};

// interface for the preferences context
interface PreferencesContextType {
  isFahrenheit: boolean;
  isDarkMode: boolean;
  theme: typeof Colors.light;
  toggleTempUnit: () => void;
  toggleDarkMode: () => void;
}

// creating the preferences context
const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined,
);

// creating the provider component for preferences context
export const PreferencesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isFahrenheit, setIsFahrenheit] = useState(false); // default to celsius
  const [isDarkMode, setIsDarkMode] = useState(false); // default to light mode

  // load saved preferences from asyncstorage when the app starts
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedUnit = await AsyncStorage.getItem("@isFahrenheit");
        const savedDarkMode = await AsyncStorage.getItem("@isDarkMode");
        if (savedUnit !== null) {
          setIsFahrenheit(JSON.parse(savedUnit));
        }
        if (savedDarkMode !== null) {
          setIsDarkMode(JSON.parse(savedDarkMode));
        }
      } catch (error) {
        console.error("Error loading preferences: ", error);
      }
    };
    loadPreferences();
  }, []);

  // function to toggle temperature unit and save into the phone memory
  const toggleTempUnit = async () => {
    try {
      const newValue = !isFahrenheit;
      setIsFahrenheit(newValue);
      await AsyncStorage.setItem("@isFahrenheit", JSON.stringify(newValue));
    } catch (error) {
      console.error("Error saving temperature unit preference: ", error);
    }
  };

  // function to toggle dark mode and save into the phone memory
  const toggleDarkMode = async () => {
    try {
      const newValue = !isDarkMode;
      setIsDarkMode(newValue);
      await AsyncStorage.setItem("@isDarkMode", JSON.stringify(newValue));
    } catch (error) {
      console.error("Error saving dark mode preference: ", error);
    }
  };

  // determine the current theme based on the dark mode state
  const activeTheme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <PreferencesContext.Provider
      value={{ isFahrenheit, isDarkMode, theme: activeTheme, toggleTempUnit, toggleDarkMode }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

// custom hook so other screens can easily access the preferences context
export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};
