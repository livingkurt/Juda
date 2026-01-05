"use client";

import { useContext } from "react";
import { ColorModeContext } from "@/contexts/ColorModeContext";

export const useColorMode = () => useContext(ColorModeContext);
