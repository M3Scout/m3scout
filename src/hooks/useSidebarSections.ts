import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sidebar-sections-state";

export function useSidebarSections(sections: string[], activeSection?: string) {
  // Initialize from localStorage or default to active section open
  const [openSections, setOpenSections] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fallback to active section
        }
      }
    }
    return activeSection ? [activeSection] : [];
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
  }, [openSections]);

  // Auto-open active section if not already open
  useEffect(() => {
    if (activeSection && !openSections.includes(activeSection)) {
      setOpenSections(prev => [...prev, activeSection]);
    }
  }, [activeSection]);

  const toggleSection = useCallback((section: string) => {
    setOpenSections(prev => 
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  }, []);

  const isSectionOpen = useCallback((section: string) => {
    return openSections.includes(section);
  }, [openSections]);

  return {
    openSections,
    toggleSection,
    isSectionOpen,
    setOpenSections
  };
}
