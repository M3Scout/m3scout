import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initChunkErrorRecovery } from "./lib/chunkErrorRecovery";


// CRITICAL: Initialize chunk error recovery BEFORE React renders
// This catches module load failures and auto-recovers
initChunkErrorRecovery();

// Performance timing - app mount
if (import.meta.env.DEV) {
  (window as any).__APP_MOUNT_START = performance.now();
  console.log("[TIMING] App mount start");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
