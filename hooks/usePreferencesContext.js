"use client";

import { useContext } from "react";
import { PreferencesContext } from "@/contexts/PreferencesContextDefinition";

export function usePreferencesContext() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferencesContext must be used within PreferencesProvider");
  }
  return context;
}
