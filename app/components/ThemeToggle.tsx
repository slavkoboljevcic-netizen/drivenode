"use client";

import { useSyncExternalStore } from "react";
import Button from "./Button";

function subscribe(onChange: () => void) {
  const syncStorage = () => {
    document.documentElement.dataset.theme = getTheme() ? "dark" : "light";
    onChange();
  };
  window.addEventListener("dnfm-theme-change", onChange);
  window.addEventListener("storage", syncStorage);
  return () => {
    window.removeEventListener("dnfm-theme-change", onChange);
    window.removeEventListener("storage", syncStorage);
  };
}

function getTheme() {
  try {
    return localStorage.getItem("dnfm_theme") === "dark";
  } catch {
    return document.documentElement.dataset.theme === "dark";
  }
}

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getTheme, () => false);
  const toggle = () => {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("dnfm_theme", theme);
    } catch {
      // The theme still works when browser storage is unavailable.
    }
    window.dispatchEvent(new Event("dnfm-theme-change"));
  };

  return (
    <Button
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? "Uključi svetlu temu" : "Uključi tamnu temu"}
      aria-pressed={dark}
      title={dark ? "Uključi svetlu temu" : "Uključi tamnu temu"}
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
      <span className="theme-toggle-label">{dark ? "Svetla tema" : "Tamna tema"}</span>
    </Button>
  );
}
