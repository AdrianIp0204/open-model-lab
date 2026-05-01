// @vitest-environment node

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
  POST,
} from "@/app/api/account/assignments/route";
import { MAX_SAVED_ASSIGNMENTS_PER_COLLECTION } from "@/lib/account/assignments";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import {
  getSharedAssignmentById,
  getStoredAssignmentsIndexForCookieHeader,
} from "@/lib/account/server-store";

const mocks = vi.hoisted(() => ({
  getAccountSessionForCookieHeaderMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
  getStoredProgressForCookieHeader: vi.fn(),
  mergeStoredProgressForCookieHeader: vi.fn(),
}));

let accountStorePath: string | null = null;
const SESSION_COOKIE = "sb-auth-token=1";

async function useIsolatedAccountStore() {
  accountStorePath = path.join(
    process.cwd(),
    "output",
    `account-assignments-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_ACCOUNT_STORE_PATH", accountStorePath);
}

describe("account assignments route", () => {
  beforeEach(() => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "teacher@example.com",
        displayName: "Teacher",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();

    if (accountStorePath) {
      await fs.rm(accountStorePath, { force: true }).catch(() => undefined);
      await fs.rm(`${accountStorePath}.tmp`, { force: true }).catch(() => undefined);
      accountStorePath = null;
    }
  });

  it("saves, updates, reads, resolves, and deletes stable guided-collection assignments", async () => {
    await useIsolatedAccountStore();

    const sessionCookie = SESSION_COOKIE;

    const createResponse = await POST(
      new Request("http://localhost/api/account/assignments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          collectionSlug: "waves-evidence-loop",
          title: "Wave evidence assignment",
          summary: "Keep the topic map, starter track, and interference checkpoint together.",
          stepIds: [
            "waves-topic-route",
            "waves-starter-track",
            "waves-dark-band-challenge",
          ],
          launchStepId: "waves-starter-track",
          teacherNote: "Start with the track, then use the challenge to check whether interference language is sticking.",
        }),
      }),
    );
    const createPayload = (await createResponse.json()) as {
      items: Array<{ id: string }>;
      replacedExisting: boolean;
      savedAssignment: {
        id: string;
        title: string;
        teacherNote: string | null;
        launchStepId: string | null;
      };
    };

    expect(createResponse.status).toBe(200);
    expect(createPayload.replacedExisting).toBe(false);
    expect(createPayload.savedAssignment.title).toBe("Wave evidence assignment");
    expect(createPayload.savedAssignment.teacherNote).toMatch(/track, then use the challenge/i);
    expect(createPayload.savedAssignment.launchStepId).toBe("waves-starter-track");
    expect(createPayload.items).toHaveLength(1);

    const assignmentId = createPayload.savedAssignment.id;

    const updateResponse = await POST(
      new Request("http://localhost/api/account/assignments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          id: assignmentId,
          collectionSlug: "waves-evidence-loop",
          title: "Wave evidence assignment",
          summary: "Tighten the sequence around the track and dark-band checkpoint.",
          stepIds: ["waves-starter-track", "waves-dark-band-challenge"],
          launchStepId: "waves-dark-band-challenge",
          teacherNote: "Use the challenge as the handoff into discussion.",
        }),
      }),
    );
    const updatePayload = (await updateResponse.json()) as {
      items: Array<{ id: string }>;
      replacedExisting: boolean;
      savedAssignment: {
        id: string;
        stepIds: string[];
        launchStepId: string | null;
        teacherNote: string | null;
      };
    };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.replacedExisting).toBe(true);
    expect(updatePayload.savedAssignment.id).toBe(assignmentId);
    expect(updatePayload.savedAssignment.stepIds).toEqual([
      "waves-starter-track",
      "waves-dark-band-challenge",
    ]);
    expect(updatePayload.savedAssignment.launchStepId).toBe("waves-dark-band-challenge");
    expect(updatePayload.savedAssignment.teacherNote).toBe(
      "Use the challenge as the handoff into discussion.",
    );

    const readResponse = await GET(
      new Request("http://localhost/api/account/assignments?collection=waves-evidence-loop", {
        headers: {
          cookie: sessionCookie,
        },
      }),
    );
    const readPayload = (await readResponse.json()) as {
      items: Array<{
        id: string;
        teacherNote: string | null;
      }>;
    };

    expect(readResponse.status).toBe(200);
    expect(readPayload.items).toHaveLength(1);
    expect(readPayload.items[0]?.id).toBe(assignmentId);
    expect(readPayload.items[0]?.teacherNote).toBe(
      "Use the challenge as the handoff into discussion.",
    );

    const sharedAssignment = await getSharedAssignmentById(assignmentId);

    expect(sharedAssignment).toMatchObject({
      id: assignmentId,
      title: "Wave evidence assignment",
      collectionSlug: "waves-evidence-loop",
      teacherNote: "Use the challenge as the handoff into discussion.",
      launchStep: {
        id: "waves-dark-band-challenge",
        href: "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
      },
    });

    const deleteResponse = await DELETE(
      new Request("http://localhost/api/account/assignments", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          collectionSlug: "waves-evidence-loop",
          id: assignmentId,
        }),
      }),
    );
    const deletePayload = (await deleteResponse.json()) as {
      items: unknown[];
    };

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.items).toEqual([]);
    await expect(getSharedAssignmentById(assignmentId)).resolves.toBeNull();
  });

  it("enforces the per-collection saved assignment limit for signed-in users", async () => {
    await useIsolatedAccountStore();

    const sessionCookie = SESSION_COOKIE;

    for (let index = 0; index < MAX_SAVED_ASSIGNMENTS_PER_COLLECTION; index += 1) {
      const saveResponse = await POST(
        new Request("http://localhost/api/account/assignments", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: sessionCookie,
          },
          body: JSON.stringify({
            collectionSlug: "waves-evidence-loop",
            title: `Assignment ${index + 1}`,
            summary: `Compact assignment ${index + 1}.`,
            stepIds: ["waves-starter-track"],
            launchStepId: "waves-starter-track",
            teacherNote: null,
          }),
        }),
      );

      expect(saveResponse.status).toBe(200);
    }

    const limitResponse = await POST(
      new Request("http://localhost/api/account/assignments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          collectionSlug: "waves-evidence-loop",
          title: "Assignment overflow",
          summary: "One more assignment than the collection limit allows.",
          stepIds: ["waves-dark-band-challenge"],
          launchStepId: "waves-dark-band-challenge",
          teacherNote: "Overflow",
        }),
      }),
    );
    const limitPayload = (await limitResponse.json()) as {
      code: string;
    };

    expect(limitResponse.status).toBe(409);
    expect(limitPayload.code).toBe("assignment_limit_reached");
  });

  it("lists resolved saved assignments across guided collections for the signed-in dashboard", async () => {
    await useIsolatedAccountStore();

    const sessionCookie = SESSION_COOKIE;

    const firstResponse = await POST(
      new Request("http://localhost/api/account/assignments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          collectionSlug: "waves-evidence-loop",
          title: "Wave evidence assignment",
          summary: "Keep the track and one challenge checkpoint together.",
          stepIds: ["waves-dark-band-challenge"],
          launchStepId: "waves-dark-band-challenge",
          teacherNote: "Use this as the first interference check.",
        }),
      }),
    );

    expect(firstResponse.status).toBe(200);

    const secondResponse = await POST(
      new Request("http://localhost/api/account/assignments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          collectionSlug: "electricity-bridge-lesson-set",
          title: "Electricity bridge assignment",
          summary: "Use the challenge as the bridge handoff.",
          stepIds: ["electricity-voltage-checkpoint"],
          launchStepId: "electricity-voltage-checkpoint",
          teacherNote: "Check the bridge before reopening the full sequence.",
        }),
      }),
    );

    expect(secondResponse.status).toBe(200);

    const assignments = await getStoredAssignmentsIndexForCookieHeader(sessionCookie);

    expect(assignments).toHaveLength(2);
    expect(assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Electricity bridge assignment",
          collectionSlug: "electricity-bridge-lesson-set",
          teacherNote: "Check the bridge before reopening the full sequence.",
          launchStep: expect.objectContaining({
            id: "electricity-voltage-checkpoint",
          }),
        }),
        expect.objectContaining({
          title: "Wave evidence assignment",
          collectionSlug: "waves-evidence-loop",
          teacherNote: "Use this as the first interference check.",
          launchStep: expect.objectContaining({
            id: "waves-dark-band-challenge",
          }),
        }),
      ]),
    );
  });
});
