"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useGlorbit } from "@/lib/provider";

export function TabTitleBinder() {
  const { store } = useGlorbit();
  const counts = useStore(store, (s) => s.counts);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const base = "glorbit — agent room";
    const suffix =
      counts.needs > 0
        ? ` · ${counts.needs} need${counts.needs === 1 ? "s" : ""} you`
        : counts.all > 0
          ? ` · ${counts.all} unread`
          : "";
    document.title = base + suffix;
  }, [counts.needs, counts.all]);

  return null;
}
