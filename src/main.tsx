import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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