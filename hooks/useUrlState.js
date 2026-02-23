"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, usePathname } from "next/navigation";
import { URL_STATE_CONFIG, getActiveParamsForTab, isDefaultValue } from "@/lib/urlStateConfig";
import * as uiActions from "@/lib/store/slices/uiSlice";

const getActionName = reduxKey => {
  return `set${reduxKey.charAt(0).toUpperCase()}${reduxKey.slice(1)}`;
};

export function useUrlState() {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const uiState = useSelector(state => state.ui);
  const currentTab = uiState.mainTabIndex;

  const isInitialized = useRef(false);
  const isUpdatingFromUrl = useRef(false);
  const lastUrlRef = useRef("");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    isUpdatingFromUrl.current = true;

    for (const [urlKey, config] of Object.entries(URL_STATE_CONFIG)) {
      let urlValue = searchParams.get(urlKey);
      // Backward compatibility: support legacy Goals param.
      if (urlValue === null && urlKey === "goalsYear") {
        urlValue = searchParams.get("goalYear");
      }
      if (urlValue === null) continue;

      const deserializedValue = config.deserialize(urlValue);
      const actionName = getActionName(config.reduxKey);

      if (uiActions[actionName]) {
        dispatch(uiActions[actionName](deserializedValue));
      } else {
        console.warn(`[useUrlState] Action not found: ${actionName} for key ${config.reduxKey}`);
      }
    }

    setTimeout(() => {
      isUpdatingFromUrl.current = false;
    }, 0);
  }, [dispatch, searchParams]);

  useEffect(() => {
    if (isUpdatingFromUrl.current || !isInitialized.current) return;

    const params = new URLSearchParams();
    const activeParams = getActiveParamsForTab(currentTab);

    for (const [urlKey, config] of activeParams) {
      const reduxValue = uiState[config.reduxKey];
      const serialized = config.serialize(reduxValue);
      if (serialized !== null && serialized !== undefined && !isDefaultValue(config, reduxValue)) {
        params.set(urlKey, serialized);
      }
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    if (newUrl === lastUrlRef.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      lastUrlRef.current = newUrl;
      window.history.replaceState(null, "", newUrl);
    }, 100);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [uiState, currentTab, pathname]);

  return null;
}

export function useShareableUrl() {
  const pathname = usePathname();
  const uiState = useSelector(state => state.ui);
  const currentTab = uiState.mainTabIndex;

  const params = new URLSearchParams();
  const activeParams = getActiveParamsForTab(currentTab);

  for (const [urlKey, config] of activeParams) {
    const reduxValue = uiState[config.reduxKey];
    const serialized = config.serialize(reduxValue);
    if (serialized !== null && serialized !== undefined && !isDefaultValue(config, reduxValue)) {
      params.set(urlKey, serialized);
    }
  }

  const base = typeof window !== "undefined" ? window.location.origin : "";
  return params.toString() ? `${base}${pathname}?${params.toString()}` : `${base}${pathname}`;
}
