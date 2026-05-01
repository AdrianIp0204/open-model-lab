// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from "@/app/concepts/[slug]/page";
import { getLocaleAbsoluteUrl } from "@/lib/metadata";
import { getConceptBySlug } from "@/lib/content";

describe("math concept route seams", () => {
  it("locks concept pages to the catalog slugs for the new math routes", () => {
    const routeSlugs = new Set(generateStaticParams().map((entry) => entry.slug));

    expect(dynamicParams).toBe(false);
    expect(routeSlugs.has("unit-circle-sine-cosine-from-rotation")).toBe(true);
    expect(routeSlugs.has("polar-coordinates-radius-and-angle")).toBe(true);
    expect(routeSlugs.has("trig-identities-from-unit-circle-geometry")).toBe(true);
    expect(routeSlugs.has("inverse-trig-angle-from-ratio")).toBe(true);
    expect(routeSlugs.has("limits-and-continuity-approaching-a-value")).toBe(true);
    expect(routeSlugs.has("optimization-maxima-minima-and-constraints")).toBe(true);
  });

  it("keeps the unit-circle concept route metadata aligned with canonical content", async () => {
    const concept = getConceptBySlug("unit-circle-sine-cosine-from-rotation");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: concept.slug }),
    });
    const featuredSetupLabels =
      concept.pageFramework?.featuredSetups?.map((item) => item.label) ?? [];

    expect(metadata.title).toBe(concept.seo?.title ?? concept.title);
    expect(metadata.description).toBe(concept.seo?.description ?? concept.summary);
    expect(metadata.alternates?.canonical).toBe(
      getLocaleAbsoluteUrl(`/concepts/${concept.slug}`, "en"),
    );
    expect(featuredSetupLabels).toContain("Projection link");
  });

  it("keeps the adjacent math concepts reachable through the same canonical route seam", async () => {
    const polarMetadata = await generateMetadata({
      params: Promise.resolve({ slug: "polar-coordinates-radius-and-angle" }),
    });
    const trigIdentityMetadata = await generateMetadata({
      params: Promise.resolve({ slug: "trig-identities-from-unit-circle-geometry" }),
    });
    const inverseTrigMetadata = await generateMetadata({
      params: Promise.resolve({ slug: "inverse-trig-angle-from-ratio" }),
    });
    const limitsMetadata = await generateMetadata({
      params: Promise.resolve({ slug: "limits-and-continuity-approaching-a-value" }),
    });
    const optimizationMetadata = await generateMetadata({
      params: Promise.resolve({ slug: "optimization-maxima-minima-and-constraints" }),
    });

    expect(polarMetadata.title).toBe("Polar Coordinates / Radius and Angle");
    expect(trigIdentityMetadata.title).toBe("Trig Identities from Unit-Circle Geometry");
    expect(inverseTrigMetadata.title).toBe("Inverse Trig / Angle from Ratio");
    expect(limitsMetadata.title).toBe("Limits and Continuity / Approaching a Value");
    expect(optimizationMetadata.title).toBe("Optimization / Maxima, Minima, and Constraints");
  });
});
