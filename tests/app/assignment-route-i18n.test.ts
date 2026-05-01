// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSharedAssignmentById } = vi.hoisted(() => ({
  mockGetSharedAssignmentById: vi.fn(),
}));

vi.mock("@/lib/account/server-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account/server-store")>(
    "@/lib/account/server-store",
  );

  return {
    ...actual,
    getSharedAssignmentById: mockGetSharedAssignmentById,
  };
});

import { generateMetadata as generateAssignmentMetadata } from "@/app/assignments/[id]/page";
import { generateMetadata as generateLocalizedAssignmentMetadata } from "@/app/[locale]/assignments/[id]/page";

describe("assignment route i18n metadata", () => {
  beforeEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    mockGetSharedAssignmentById.mockReset();
    mockGetSharedAssignmentById.mockResolvedValue({
      id: "assignment-1",
      title: "Wave evidence",
      summary: "Track plus one interference checkpoint.",
      collectionTitle: "Wave fundamentals",
      concepts: [{ title: "Waves" }, { title: "Interference" }],
    });
  });

  it("localizes locale-prefixed assignment metadata in zh-HK", async () => {
    const metadata = await generateLocalizedAssignmentMetadata({
      params: Promise.resolve({ locale: "zh-HK", id: "assignment-1" }),
    });

    expect(metadata.title).toBe("Wave evidence 作業");
    expect(metadata.description).toBe("Track plus one interference checkpoint.");
    expect(metadata.alternates?.canonical).toContain("/zh-HK/assignments/assignment-1");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining(["Wave evidence", "作業", "引導式合集作業", "Waves"]),
    );
    expect(metadata.openGraph?.locale).toBe("zh_HK");
  });

  it("keeps English assignment metadata on the root route", async () => {
    globalThis.__TEST_LOCALE__ = "en";

    const metadata = await generateAssignmentMetadata({
      params: Promise.resolve({ id: "assignment-1" }),
    });

    expect(metadata.title).toBe("Wave evidence assignment");
    expect(metadata.alternates?.canonical).toContain("/en/assignments/assignment-1");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining([
        "Wave evidence",
        "assignment",
        "guided collection assignment",
        "Wave fundamentals",
      ]),
    );
  });
});
