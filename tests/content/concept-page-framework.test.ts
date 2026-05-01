import { describe, expect, it } from "vitest";
import { getConceptBySlug, getReadNextRecommendations } from "@/lib/content";
import { resolveConceptPageSections } from "@/lib/content/concept-page-framework";

describe("concept page framework", () => {
  it("resolves the default lower-page section contract in canonical order", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.map((section) => section.id)).toEqual([
      "explanation",
      "keyIdeas",
      "workedExamples",
      "commonMisconception",
      "miniChallenge",
      "quickTest",
      "accessibility",
      "readNext",
    ]);
  });

  it("supports bounded section overrides without changing the framework contract", () => {
    const concept = structuredClone(getConceptBySlug("projectile-motion"));
    concept.pageFramework = {
      sections: [
        {
          id: "keyIdeas",
          title: "Core ideas",
        },
        {
          id: "miniChallenge",
          enabled: false,
        },
      ],
    };

    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "keyIdeas")?.title).toBe("Core ideas");
    expect(sections.some((section) => section.id === "miniChallenge")).toBe(false);
  });

  it("applies the authored UCM override for section title and ordering", () => {
    const concept = getConceptBySlug("uniform-circular-motion");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(
      sections.find((section) => section.id === "workedExamples")?.title,
    ).toBe("Live circular-motion examples");
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Follow this motion next",
    );
  });

  it("applies the authored vectors/components override through the shared contract", () => {
    const concept = getConceptBySlug("vectors-components");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live component checks",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Build toward mechanics",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored torque override through the shared contract", () => {
    const concept = getConceptBySlug("torque");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live torque checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Turning-effect checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry turning ideas forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored static-equilibrium override through the shared contract", () => {
    const concept = getConceptBySlug("static-equilibrium-centre-of-mass");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live balance checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Support-region checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry balance ideas forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored rotational-inertia override through the shared contract", () => {
    const concept = getConceptBySlug("rotational-inertia");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live inertia checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Mass-distribution checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry rotational ideas forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored rolling-motion override through the shared contract", () => {
    const concept = getConceptBySlug("rolling-motion");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live rolling checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "No-slip checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry rolling ideas forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored angular-momentum override through the shared contract", () => {
    const concept = getConceptBySlug("angular-momentum");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live angular-momentum checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Conservation checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry rotational momentum forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored standing-waves override through the shared contract", () => {
    const concept = getConceptBySlug("standing-waves");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live harmonic checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Node checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the wave story going",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored Doppler override through the shared contract", () => {
    const concept = getConceptBySlug("doppler-effect");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live Doppler checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Passing-source checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the sound story moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored conservation-of-momentum override through the shared contract", () => {
    const concept = getConceptBySlug("conservation-of-momentum");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live conservation checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "System-total checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep momentum reasoning moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored electric-fields override through the shared contract", () => {
    const concept = getConceptBySlug("electric-fields");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live field checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Charge-sign checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the field story moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored gravitational-fields override through the shared contract", () => {
    const concept = getConceptBySlug("gravitational-fields");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live gravity checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Inverse-square checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Bridge this into orbits",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored gravitational-potential override through the shared contract", () => {
    const concept = getConceptBySlug("gravitational-potential-energy");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live potential-well checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Potential-well checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Connect fields, energy, and orbits",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored circular-orbits override through the shared contract", () => {
    const concept = getConceptBySlug("circular-orbits-orbital-speed");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live orbit checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Orbit-balance checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry the orbit bridge forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored Kepler-period override through the shared contract", () => {
    const concept = getConceptBySlug("keplers-third-law-orbital-periods");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live period checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Kepler checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the orbit-timing story moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored escape-velocity override through the shared contract", () => {
    const concept = getConceptBySlug("escape-velocity");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live escape checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Escape-threshold checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the gravity launch story moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored basic-circuits override through the shared contract", () => {
    const concept = getConceptBySlug("basic-circuits");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live circuit checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Current-split checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the electricity story moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored power/energy circuits override through the shared contract", () => {
    const concept = getConceptBySlug("power-energy-circuits");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live power checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Energy-over-time checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the circuit story going",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored series/parallel circuits override through the shared contract", () => {
    const concept = getConceptBySlug("series-parallel-circuits");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live branch checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Bulb-behavior checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the circuit path moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored equivalent-resistance override through the shared contract", () => {
    const concept = getConceptBySlug("equivalent-resistance");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live reduction checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Reduction-order checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the electricity path moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored Kirchhoff override through the shared contract", () => {
    const concept = getConceptBySlug("kirchhoff-loop-and-junction-rules");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live Kirchhoff checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Loop-balance checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Use these rules to simplify next",
    );
  });

  it("applies the authored electric-potential override through the shared contract", () => {
    const concept = getConceptBySlug("electric-potential");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live potential checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Potential-difference checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Connect this voltage view",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored capacitance override through the shared contract", () => {
    const concept = getConceptBySlug("capacitance-and-stored-electric-energy");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live capacitor checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Charge-storage checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry stored charge into circuits",
    );
  });

  it("applies the authored RC override through the shared contract", () => {
    const concept = getConceptBySlug("rc-charging-and-discharging");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live RC checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "1tau checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the time-response story moving",
    );
  });

  it("applies the authored internal-resistance override through the shared contract", () => {
    const concept = getConceptBySlug("internal-resistance-and-terminal-voltage");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live source checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Terminal-voltage checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the source-realism story moving",
    );
  });

  it("applies the authored magnetic-fields override through the shared contract", () => {
    const concept = getConceptBySlug("magnetic-fields");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live magnetic checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Right-hand-rule checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the source-field story moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored electromagnetic-induction override through the shared contract", () => {
    const concept = getConceptBySlug("electromagnetic-induction");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live induction checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Flux-change checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Keep the electricity-magnetism story moving",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored Maxwell synthesis override through the shared contract", () => {
    const concept = getConceptBySlug("maxwells-equations-synthesis");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live synthesis checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Field-bridge checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry the synthesis into waves",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored electromagnetic-waves override through the shared contract", () => {
    const concept = getConceptBySlug("electromagnetic-waves");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live field-pair checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Propagation-triad checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry the wave story forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored light-spectrum override through the shared contract", () => {
    const concept = getConceptBySlug("light-spectrum-linkage");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live light-and-spectrum checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Color-and-medium checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry this light into optics",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored dispersion override through the shared contract", () => {
    const concept = getConceptBySlug("dispersion-refractive-index-color");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live dispersion checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Prism-spread checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry color-dependent bending forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored polarization override through the shared contract", () => {
    const concept = getConceptBySlug("polarization");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live polarization checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Transverse-wave checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry wave orientation deeper into optics",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored double-slit override through the shared contract", () => {
    const concept = getConceptBySlug("double-slit-interference");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live double-slit checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Fringe-spacing checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry interference deeper into optics",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored photoelectric override through the shared contract", () => {
    const concept = getConceptBySlug("photoelectric-effect");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live photoelectric checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Threshold checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry the frequency story forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored atomic-spectra override through the shared contract", () => {
    const concept = getConceptBySlug("atomic-spectra");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live spectra checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Line-pattern checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry the line story forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored de-broglie-matter-waves override through the shared contract", () => {
    const concept = getConceptBySlug("de-broglie-matter-waves");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live matter-wave checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Whole-number-fit checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry the wave-quantum bridge forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored bohr-model override through the shared contract", () => {
    const concept = getConceptBySlug("bohr-model");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live Bohr checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Hydrogen-line checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry the hydrogen story forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("applies the authored radioactivity-half-life override through the shared contract", () => {
    const concept = getConceptBySlug("radioactivity-half-life");
    const sections = resolveConceptPageSections(concept, {
      readNext: getReadNextRecommendations(concept.slug),
    });

    expect(sections.find((section) => section.id === "workedExamples")?.title).toBe(
      "Live half-life checks",
    );
    expect(sections.find((section) => section.id === "miniChallenge")?.title).toBe(
      "Chance-versus-curve checkpoint",
    );
    expect(sections.find((section) => section.id === "readNext")?.title).toBe(
      "Carry the modern-physics branch forward",
    );
    expect(
      sections.findIndex((section) => section.id === "miniChallenge"),
    ).toBeLessThan(sections.findIndex((section) => section.id === "commonMisconception"));
  });

  it("skips optional surfaces when their backing data is unavailable", () => {
    const concept = getConceptBySlug("damping-resonance");
    const sections = resolveConceptPageSections(concept, { readNext: [] });

    expect(sections.some((section) => section.id === "readNext")).toBe(false);
  });
});
