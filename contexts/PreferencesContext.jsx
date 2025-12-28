"use client";

import { usePreferences } from "@/hooks/usePreferences";
import { PreferencesContext } from "./PreferencesContextDefinition";

export function PreferencesProvider({ children }) {
  const preferencesHook = usePreferences();

  return <PreferencesContext.Provider value={preferencesHook}>{children}</PreferencesContext.Provider>;
}
