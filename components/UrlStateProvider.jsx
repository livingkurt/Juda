"use client";

import { Suspense } from "react";
import { useUrlState } from "@/hooks/useUrlState";

function UrlStateSyncInner() {
  useUrlState();
  return null;
}

export function UrlStateProvider({ children }) {
  return (
    <>
      <Suspense fallback={null}>
        <UrlStateSyncInner />
      </Suspense>
      {children}
    </>
  );
}
