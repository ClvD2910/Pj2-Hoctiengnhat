import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext(null);

const DEFAULTS = {
  showFurigana: true,
  showRomaji: false,
  darkMode: false,
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem("renshuu_settings");
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  // Apply / remove "dark" class on <html> when darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings.darkMode]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem("renshuu_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext);
