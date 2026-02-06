/**
 * Web Vitals Measurement Utility
 * 
 * Collects Core Web Vitals (LCP, INP, CLS, TTFB, FCP)
 * for performance debugging and monitoring.
 */

export interface WebVitalsData {
  /** Largest Contentful Paint (ms) */
  lcp: number | null;
  /** Interaction to Next Paint (ms) - replaces FID */
  inp: number | null;
  /** Cumulative Layout Shift (score) */
  cls: number | null;
  /** Time to First Byte (ms) */
  ttfb: number | null;
  /** First Contentful Paint (ms) */
  fcp: number | null;
  /** Timestamp of last update */
  updatedAt: number;
}

// Module state for accumulated metrics
let vitalsData: WebVitalsData = {
  lcp: null,
  inp: null,
  cls: null,
  ttfb: null,
  fcp: null,
  updatedAt: Date.now(),
};

let observers: Set<(data: WebVitalsData) => void> = new Set();

/**
 * Initialize Web Vitals collection
 * Call once at app startup
 */
export function initWebVitals(): void {
  if (typeof window === "undefined") return;
  
  // TTFB - Time to First Byte
  try {
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    if (navEntry) {
      vitalsData.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
      notifyObservers();
    }
  } catch {
    // Ignore if not supported
  }
  
  // FCP - First Contentful Paint
  try {
    const paintEntries = performance.getEntriesByType("paint");
    const fcpEntry = paintEntries.find(e => e.name === "first-contentful-paint");
    if (fcpEntry) {
      vitalsData.fcp = Math.round(fcpEntry.startTime);
      notifyObservers();
    }
  } catch {
    // Ignore if not supported
  }
  
  // LCP - Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        vitalsData.lcp = Math.round(lastEntry.startTime);
        vitalsData.updatedAt = Date.now();
        notifyObservers();
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // Ignore if not supported
  }
  
  // CLS - Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      vitalsData.cls = Math.round(clsValue * 1000) / 1000;
      vitalsData.updatedAt = Date.now();
      notifyObservers();
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // Ignore if not supported
  }
  
  // INP - Interaction to Next Paint (replacing FID)
  try {
    let inpValue = 0;
    const inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        // Track the worst interaction
        const duration = entry.duration ?? (entry.processingEnd - entry.startTime);
        if (duration > inpValue) {
          inpValue = duration;
          vitalsData.inp = Math.round(inpValue);
          vitalsData.updatedAt = Date.now();
          notifyObservers();
        }
      }
    });
    // Use type assertion because durationThreshold is valid but not in TS types
    inpObserver.observe({ type: "event", buffered: true } as PerformanceObserverInit);
  } catch {
    // Ignore if not supported
  }
}

/**
 * Get current Web Vitals data
 */
export function getWebVitals(): WebVitalsData {
  return { ...vitalsData };
}

/**
 * Subscribe to Web Vitals updates
 */
export function subscribeToWebVitals(callback: (data: WebVitalsData) => void): () => void {
  observers.add(callback);
  // Send current state immediately
  callback(getWebVitals());
  
  return () => {
    observers.delete(callback);
  };
}

function notifyObservers(): void {
  const data = getWebVitals();
  observers.forEach(cb => cb(data));
}

/**
 * Get performance rating for a metric
 */
export function getMetricRating(metric: keyof WebVitalsData, value: number | null): "good" | "needs-improvement" | "poor" | "unknown" {
  if (value === null) return "unknown";
  
  // Thresholds based on Google's Web Vitals guidelines
  const thresholds: Record<string, { good: number; poor: number }> = {
    lcp: { good: 2500, poor: 4000 },
    inp: { good: 200, poor: 500 },
    cls: { good: 0.1, poor: 0.25 },
    ttfb: { good: 800, poor: 1800 },
    fcp: { good: 1800, poor: 3000 },
  };
  
  const threshold = thresholds[metric];
  if (!threshold) return "unknown";
  
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}
