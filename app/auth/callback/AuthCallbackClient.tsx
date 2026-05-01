"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { stripLocalePrefix } from "@/i18n/routing";
import { refreshAccountSession } from "@/lib/account/client";
import { classifyAccountAuthFailure } from "@/lib/account/auth-return";
import { copyText } from "@/lib/i18n/copy-text";
import { localizeShareHref } from "@/lib/share-links";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthCallbackClientProps = {
  nextPath: string;
};

export function AuthCallbackClient({ nextPath }: AuthCallbackClientProps) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let completed = false;
    const localizedNextPath = localizeShareHref(nextPath, locale);
    const failurePath =
      stripLocalePrefix(nextPath) === "/account/reset-password"
        ? localizeShareHref("/account/reset-password", locale)
        : localizeShareHref("/account", locale);

    const finish = (target: string) => {
      if (completed) {
        return;
      }

      completed = true;
      router.replace(target);
    };

    const finishSignedInRedirect = async () => {
      await refreshAccountSession();
      finish(localizedNextPath);
    };

    const finishFailure = (error?: unknown) => {
      const authState = classifyAccountAuthFailure(error ?? { message: "auth callback failed" });
      finish(`${failurePath}?auth=${encodeURIComponent(authState)}`);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void finishSignedInRedirect();
      }
    });

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      void supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ error }) => {
          if (error) {
            finishFailure(error);
            return;
          }

          void finishSignedInRedirect();
        });
    } else {
      void supabase.auth.getSession().then(({ data, error }) => {
        if (error || !data.session) {
          finishFailure(error ?? { message: "missing callback session" });
          return;
        }

        void finishSignedInRedirect();
      });
    }

    const timeoutId = window.setTimeout(() => {
      finishFailure({ code: "callback_timeout", message: "auth callback timed out" });
    }, 5000);

    return () => {
      completed = true;
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, [locale, nextPath, router]);

  return (
    <main className="mx-auto flex min-h-[40vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
        {copyText(locale, "Account", "帳戶")}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {copyText(locale, "Finishing sign-in", "正在完成登入")}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
        {copyText(
          locale,
          "Open Model Lab is completing the magic-link handoff and restoring your synced concept progress.",
          "Open Model Lab 正在完成魔法連結登入，並恢復你的同步概念進度。",
        )}
      </p>
    </main>
  );
}
