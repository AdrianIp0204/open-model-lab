"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import {
  initializeAccountSession,
  refreshAccountSession,
  useAccountSession,
} from "@/lib/account/client";
import { localConceptProgressStore } from "@/lib/progress";
import { localSavedCompareSetupsStore } from "@/lib/saved-compare-setups-store";
import { localSavedSetupsStore } from "@/lib/saved-setups-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AccountSyncProviderProps = {
  children: ReactNode;
};

export function AccountSyncProvider({ children }: AccountSyncProviderProps) {
  const session = useAccountSession();
  const accountUser = session.user;
  const canSyncProgress = session.entitlement.capabilities.canSyncProgress;
  const canSyncSavedSetups =
    session.entitlement.capabilities.canSyncProgress &&
    session.entitlement.capabilities.canSaveCompareSetups;

  useEffect(() => {
    initializeAccountSession();
  }, []);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    ) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "TOKEN_REFRESHED" &&
        event !== "USER_UPDATED"
      ) {
        return;
      }

      void refreshAccountSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session.status === "signed-in" && accountUser && canSyncProgress) {
      localConceptProgressStore.enableRemoteSync(accountUser);
    } else {
      localConceptProgressStore.disableRemoteSync();
    }

    if (session.status === "signed-in" && accountUser && canSyncSavedSetups) {
      localSavedSetupsStore.enableRemoteSync(accountUser);
      localSavedCompareSetupsStore.enableRemoteSync(accountUser);
    } else {
      localSavedSetupsStore.disableRemoteSync();
      localSavedCompareSetupsStore.disableRemoteSync();
    }
  }, [accountUser, canSyncProgress, canSyncSavedSetups, session.status]);

  return children;
}
