"use client";

import { createContext, useContext } from "react";
import { usePreferences } from "@/hooks/usePreferences";

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const preferencesHook = usePreferences();

  return <PreferencesContext.Provider value={preferencesHook}>{children}</PreferencesContext.Provider>;
}

export function usePreferencesContext() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferencesContext must be used within PreferencesProvider");
  }
  return context;
}
