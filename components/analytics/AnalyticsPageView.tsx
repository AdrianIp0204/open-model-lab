"use client";

import { useEffect, useRef } from "react";
import { trackPageDiscovery, type AnalyticsContextInput } from "@/lib/analytics";

type AnalyticsPageViewProps = {
  context: AnalyticsContextInput;
};

export function AnalyticsPageView({ context }: AnalyticsPageViewProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;

    const track = () => {
      trackPageDiscovery(context);
    };

    const windowWithIdleCallbacks = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const idleHandle = windowWithIdleCallbacks.requestIdleCallback?.(track, {
      timeout: 1200,
    });

    if (idleHandle !== undefined) {
      return () => {
        windowWithIdleCallbacks.cancelIdleCallback?.(idleHandle);
      };
    }

    const timeoutId = window.setTimeout(track, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [context]);

  return null;
}
