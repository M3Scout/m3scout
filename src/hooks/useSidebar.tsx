import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = "sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState(() => {
    // Load from localStorage on init
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "true";
    }
    return false;
  });

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const setIsCollapsed = (value: boolean) => {
    setIsCollapsedState(value);
  };

  const toggleCollapsed = () => {
    setIsCollapsedState((prev) => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
