import { expect, test, type Page } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
  type BrowserGuard,
} from "./helpers";

function buildSignedOutPayload(authMode: "supabase" | "dev-harness" = "supabase") {
  return {
    session: null,
    entitlement: {
      tier: "free",
      source: "anonymous-default",
      capabilities: {
        shouldShowAds: true,
        canSyncProgress: false,
        canSaveCompareSetups: false,
        canShareStateLinks: false,
        canUseAdvancedStudyTools: false,
      },
    },
    authMode,
  };
}

function buildSignedInFreePayload() {
  return {
    session: {
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-04-03T00:00:00.000Z",
      },
      entitlement: {
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
        capabilities: {
          shouldShowAds: true,
          canSyncProgress: true,
          canSaveCompareSetups: false,
          canShareStateLinks: false,
          canUseAdvancedStudyTools: false,
        },
      },
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    },
    entitlement: {
      tier: "free",
      source: "stored",
      updatedAt: "2026-04-02T00:00:00.000Z",
      capabilities: {
        shouldShowAds: true,
        canSyncProgress: true,
        canSaveCompareSetups: false,
        canShareStateLinks: false,
        canUseAdvancedStudyTools: false,
      },
    },
    authMode: "supabase",
  };
}

async function mockAccountSessionApi(
  page: Page,
  handler: (input: {
    method: string;
    body: Record<string, unknown> | null;
  }) => {
    status: number;
    body: unknown;
  },
) {
  await page.route("**/api/account/session", async (route) => {
    const request = route.request();
    const body =
      request.method() === "POST"
        ? ((request.postDataJSON() as Record<string, unknown> | null) ?? null)
        : null;
    const response = handler({
      method: request.method(),
      body,
    });

    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    });
  });
}

let browserGuard: BrowserGuard;

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("shows returning-user and first-time auth paths clearly on the signed-out account surface", async ({
  page,
}) => {
  await mockAccountSessionApi(page, ({ method }) => {
    if (method === "GET") {
      return {
        status: 200,
        body: buildSignedOutPayload(),
      };
    }

    return {
      status: 500,
      body: {
        code: "unexpected_request",
        error: "Unexpected request",
      },
    };
  });

  await gotoAndExpectOk(page, "/account");

  await expect(
    page.getByRole("heading", {
      name: "Returning users with a password can sign in directly. First-time users and passwordless users should start with an email link.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /stay signed out and keep progress local to this browser/i,
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with password" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send password-reset email" })).toBeVisible();
});

test("uses the full desktop width for the signed-out auth grid without the old placeholder column", async ({
  page,
}) => {
  await mockAccountSessionApi(page, ({ method }) => {
    if (method === "GET") {
      return {
        status: 200,
        body: buildSignedOutPayload(),
      };
    }

    return {
      status: 500,
      body: {
        code: "unexpected_request",
        error: "Unexpected request",
      },
    };
  });

  await gotoAndExpectOk(page, "/account");

  await expect(page.getByText("What sync keeps")).toHaveCount(0);
  await expect(page.getByText("First sign-in")).toHaveCount(0);

  const passwordCard = page
    .getByRole("heading", { name: "Use a password only if this account already has one." })
    .locator("xpath=ancestor::section[1]");
  const magicLinkCard = page
    .getByRole("heading", {
      name: "Start with an email link if you do not already use a password here.",
    })
    .locator("xpath=ancestor::section[1]");
  const resetCard = page
    .getByRole("heading", { name: "Reset a password for an existing account." })
    .locator("xpath=ancestor::section[1]");

  const [passwordBox, magicLinkBox, resetBox] = await Promise.all([
    passwordCard.boundingBox(),
    magicLinkCard.boundingBox(),
    resetCard.boundingBox(),
  ]);

  expect(passwordBox?.width ?? 0).toBeGreaterThan(300);
  expect(magicLinkBox?.width ?? 0).toBeGreaterThan(300);
  expect(resetBox?.width ?? 0).toBeGreaterThan(260);
});

test("shows the bounded wrong-password UX for returning-user password sign-in", async ({
  page,
}) => {
  let signInPayload: Record<string, unknown> | null = null;

  await mockAccountSessionApi(page, ({ method, body }) => {
    if (method === "GET") {
      return {
        status: 200,
        body: buildSignedOutPayload(),
      };
    }

    signInPayload = body;
    return {
      status: 401,
      body: {
        code: "invalid_credentials",
        error: "Incorrect email or password",
      },
    };
  });

  await gotoAndExpectOk(page, "/account");
  await page.getByLabel("Email for password sign-in").fill("student@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in with password" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Incorrect email or password" }),
  ).toContainText("Incorrect email or password");
  expect(signInPayload).toMatchObject({
    action: "password-sign-in",
    email: "student@example.com",
    password: "wrong-password",
  });
});

test("shows the forgot-password request notice on the real account page", async ({ page }) => {
  let resetPayload: Record<string, unknown> | null = null;

  await mockAccountSessionApi(page, ({ method, body }) => {
    if (method === "GET") {
      return {
        status: 200,
        body: buildSignedOutPayload(),
      };
    }

    resetPayload = body;
    return {
      status: 200,
        body: {
          ok: true,
          message:
            "If that email matches an existing account, a password-reset email has been sent. Check your inbox and spam for the link.",
        },
      };
  });

  await gotoAndExpectOk(page, "/account");
  await page.getByLabel("Email for password reset").fill("student@example.com");
  await page.getByRole("button", { name: "Send password-reset email" }).click();

  await expect(
    page.getByText(/password-reset email has been sent/i),
  ).toBeVisible();
  expect(resetPayload).toMatchObject({
    action: "password-reset",
    email: "student@example.com",
  });
});

test("keeps long email inputs and the email-link success state readable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await mockAccountSessionApi(page, ({ method }) => {
    if (method === "GET") {
      return {
        status: 200,
        body: buildSignedOutPayload(),
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        message: "Check your inbox and spam for a sign-in link.",
      },
    };
  });

  await gotoAndExpectOk(page, "/account");

  const longEmail =
    "very.long.student.alias.for-layout-checking+open-model-lab-auth@example-domain-for-testing.com";
  const emailInput = page.getByLabel("Email for sign-in link");

  await emailInput.fill(longEmail);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();

  const successAlert = page
    .locator('div[role="status"]')
    .filter({ hasText: "Check your inbox and spam for a sign-in link." });

  await expect(successAlert).toBeVisible();
  await expect(page.getByRole("button", { name: "Wait to resend" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Email sent" })).toHaveCount(0);

  const [inputBox, alertBox] = await Promise.all([
    emailInput.boundingBox(),
    successAlert.boundingBox(),
  ]);

  expect(inputBox?.width ?? 0).toBeGreaterThan(260);
  expect(alertBox?.width ?? 0).toBeGreaterThan(260);
  expect(alertBox?.height ?? 999).toBeLessThan(220);
});

test("shows a specific forgot-password failure when Supabase blocks the recovery redirect", async ({
  page,
}) => {
  browserGuard.allowIssue(/\[response 503\] \/api\/account\/session/);
  browserGuard.allowIssue(
    /\[console\.error\] Failed to load resource: the server responded with a status of 503 \(Service Unavailable\)/i,
  );

  await mockAccountSessionApi(page, ({ method }) => {
    if (method === "GET") {
      return {
        status: 200,
        body: buildSignedOutPayload(),
      };
    }

    return {
      status: 503,
      body: {
        code: "auth_redirect_unavailable",
        error:
          "Password-reset email is blocked by the current Supabase redirect settings. Add this deployment origin and /auth/confirm to the Supabase Auth Site URL and allowed redirect URLs.",
      },
    };
  });

  await gotoAndExpectOk(page, "/account");
  await page.getByLabel("Email for password reset").fill("student@example.com");
  await page.getByRole("button", { name: "Send password-reset email" }).click();

  const errorAlert = page
    .getByRole("alert")
    .filter({ hasText: "Password-reset email is blocked by the current Supabase redirect settings." });

  await expect(errorAlert).toContainText(/supabase redirect settings/i);
  await expect(errorAlert).toContainText("/auth/confirm");
});

test("shows explicit expired and already-used recovery-link states on the reset page", async ({
  page,
}) => {
  await mockAccountSessionApi(page, ({ method }) => {
    if (method === "GET") {
      return {
        status: 200,
        body: buildSignedOutPayload(),
      };
    }

    return {
      status: 500,
      body: {
        code: "unexpected_request",
        error: "Unexpected request",
      },
    };
  });

  await gotoAndExpectOk(page, "/account/reset-password?auth=expired");
  await expect(
    page.getByRole("heading", { name: "That recovery link expired." }),
  ).toBeVisible();
  await expect(
    page.getByText(/recovery links are time-limited and single-use/i),
  ).toBeVisible();

  await gotoAndExpectOk(page, "/account/reset-password?auth=used");
  await expect(
    page.getByRole("heading", { name: "That recovery link was already used." }),
  ).toBeVisible();
  await expect(
    page.getByText(/password-reset links only work once/i),
  ).toBeVisible();
});

test("shows the signed-in password-change fallback when reauthentication is required", async ({
  page,
}) => {
  let resetFallbackPayload: Record<string, unknown> | null = null;

  await page.route("**/api/account/password", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: "reauthentication_needed",
        error:
          "This project currently requires recent authentication before password changes. Send yourself a password-reset email and finish the new-password step from that link.",
      }),
    });
  });

  await mockAccountSessionApi(page, ({ method, body }) => {
    if (method === "GET") {
      return {
        status: 200,
        body: buildSignedInFreePayload(),
      };
    }

    resetFallbackPayload = body;
    return {
      status: 200,
        body: {
          ok: true,
          message:
            "If that email matches an existing account, a password-reset email has been sent. Check your inbox and spam for the link.",
        },
      };
  });

  await gotoAndExpectOk(page, "/account");
  await expect(page.getByRole("heading", { name: "Add or change a password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("updated-password-123");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("updated-password-123");
  await page.getByRole("button", { name: "Save password" }).click();

  await expect(
    page.getByText(/requires recent authentication before password changes/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Email me a password-reset link instead" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Email me a password-reset link instead" }).click();

  await expect(
    page.getByText(/password-reset email has been sent/i),
  ).toBeVisible();
  await expect(page.getByText(/signed in as student@example.com/i)).toBeVisible();
  expect(resetFallbackPayload).toMatchObject({
    action: "password-reset",
    email: "student@example.com",
  });
});

test("disables live auth actions when the dev harness signed-out fixture is active", async ({
  page,
}) => {
  await setHarnessSession(page, "signed-out");
  await gotoAndExpectOk(page, "/account");

  await expect(page.getByText(/dev harness override active/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with password" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send password-reset email" })).toBeDisabled();
});
