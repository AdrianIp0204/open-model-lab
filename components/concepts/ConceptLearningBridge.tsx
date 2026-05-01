"use client";

import {
  createContext,
  useContext,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ConceptQuickTestShowMeAction, ConceptWorkedExampleAction } from "@/lib/content";
import type { LiveWorkedExampleState } from "@/lib/learning/liveWorkedExamples";
import type { ConceptPageRuntimeSnapshot } from "@/lib/learning/conceptPageRuntime";

type QuickTestBridgeHandler = {
  applyAction: (action: ConceptQuickTestShowMeAction) => void;
  clearAction: () => void;
};

type WorkedExampleBridgeHandler = {
  applyAction: (action: ConceptWorkedExampleAction) => void;
  clearAction: () => void;
};

type ConceptLearningBridgeValue = {
  registerQuickTestHandler: (handler: QuickTestBridgeHandler | null) => void;
  applyQuickTestAction: (action: ConceptQuickTestShowMeAction) => void;
  clearQuickTestAction: () => void;
  registerWorkedExampleHandler: (handler: WorkedExampleBridgeHandler | null) => void;
  applyWorkedExampleAction: (action: ConceptWorkedExampleAction) => void;
  clearWorkedExampleAction: () => void;
  publishRuntimeSnapshot: (snapshot: ConceptPageRuntimeSnapshot | null) => void;
  subscribeRuntimeSnapshot: (listener: () => void) => () => void;
  getRuntimeSnapshot: () => ConceptPageRuntimeSnapshot | null;
  publishWorkedExampleSnapshot: (snapshot: LiveWorkedExampleState | null) => void;
  subscribeWorkedExampleSnapshot: (listener: () => void) => () => void;
  getWorkedExampleSnapshot: () => LiveWorkedExampleState | null;
};

const ConceptLearningBridgeContext = createContext<ConceptLearningBridgeValue | null>(null);

export function ConceptLearningBridgeProvider({
  children,
  initialRuntimeSnapshot = null,
}: {
  children: ReactNode;
  initialRuntimeSnapshot?: ConceptPageRuntimeSnapshot | null;
}) {
  const quickTestHandlerRef = useRef<QuickTestBridgeHandler | null>(null);
  const workedExampleHandlerRef = useRef<WorkedExampleBridgeHandler | null>(null);
  const runtimeSnapshotRef = useRef<ConceptPageRuntimeSnapshot | null>(initialRuntimeSnapshot);
  const workedExampleSnapshotRef = useRef<LiveWorkedExampleState | null>(initialRuntimeSnapshot);
  const runtimeListenersRef = useRef(new Set<() => void>());
  const workedExampleListenersRef = useRef(new Set<() => void>());

  return (
    <ConceptLearningBridgeContext.Provider
      value={{
        registerQuickTestHandler: (handler) => {
          quickTestHandlerRef.current = handler;
        },
        applyQuickTestAction: (action) => {
          quickTestHandlerRef.current?.applyAction(action);
        },
        clearQuickTestAction: () => {
          quickTestHandlerRef.current?.clearAction();
        },
        registerWorkedExampleHandler: (handler) => {
          workedExampleHandlerRef.current = handler;
        },
        applyWorkedExampleAction: (action) => {
          workedExampleHandlerRef.current?.applyAction(action);
        },
        clearWorkedExampleAction: () => {
          workedExampleHandlerRef.current?.clearAction();
        },
        publishRuntimeSnapshot: (snapshot) => {
          runtimeSnapshotRef.current = snapshot;
          workedExampleSnapshotRef.current = snapshot;
          for (const listener of runtimeListenersRef.current) {
            listener();
          }
          for (const listener of workedExampleListenersRef.current) {
            listener();
          }
        },
        subscribeRuntimeSnapshot: (listener) => {
          runtimeListenersRef.current.add(listener);

          return () => {
            runtimeListenersRef.current.delete(listener);
          };
        },
        getRuntimeSnapshot: () => runtimeSnapshotRef.current,
        publishWorkedExampleSnapshot: (snapshot) => {
          workedExampleSnapshotRef.current = snapshot;
          for (const listener of workedExampleListenersRef.current) {
            listener();
          }
        },
        subscribeWorkedExampleSnapshot: (listener) => {
          workedExampleListenersRef.current.add(listener);

          return () => {
            workedExampleListenersRef.current.delete(listener);
          };
        },
        getWorkedExampleSnapshot: () => workedExampleSnapshotRef.current,
      }}
    >
      {children}
    </ConceptLearningBridgeContext.Provider>
  );
}

export function useConceptLearningBridge() {
  const context = useContext(ConceptLearningBridgeContext);

  if (!context) {
    throw new Error("useConceptLearningBridge must be used inside ConceptLearningBridgeProvider.");
  }

  return context;
}

export function useConceptPageRuntimeSnapshot() {
  const context = useConceptLearningBridge();

  return useSyncExternalStore(
    context.subscribeRuntimeSnapshot,
    context.getRuntimeSnapshot,
    context.getRuntimeSnapshot,
  );
}

export function useLiveWorkedExampleSnapshot() {
  const context = useConceptLearningBridge();

  return useSyncExternalStore(
    context.subscribeWorkedExampleSnapshot,
    context.getWorkedExampleSnapshot,
    context.getWorkedExampleSnapshot,
  );
}
