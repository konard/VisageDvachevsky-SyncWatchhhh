import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

/**
 * Report Web Vitals metrics for performance monitoring
 *
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint): measures loading performance (good < 2.5s)
 * - INP (Interaction to Next Paint): measures responsiveness (good < 200ms)
 * - CLS (Cumulative Layout Shift): measures visual stability (good < 0.1)
 *
 * Additional metrics:
 * - FCP (First Contentful Paint): measures when first content is painted
 * - TTFB (Time to First Byte): measures server response time
 */

type ReportHandler = (metric: Metric) => void;

const defaultHandler: ReportHandler = (metric) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  }

  // In production, you would send this to your analytics service
  // Example: sendToAnalytics(metric);
};

export function reportWebVitals(onPerfEntry?: ReportHandler) {
  const handler = onPerfEntry || defaultHandler;

  // Report Core Web Vitals
  onCLS(handler);
  onINP(handler);
  onLCP(handler);

  // Report additional metrics
  onFCP(handler);
  onTTFB(handler);
}

/**
 * Send metrics to an analytics endpoint (example implementation)
 */
export function sendToAnalytics(metric: Metric) {
  // Example: Send to Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Example: Send to custom analytics endpoint
  const body = JSON.stringify(metric);
  const url = '/api/analytics/vitals';

  // Use sendBeacon if available for better reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(console.error);
  }
}
