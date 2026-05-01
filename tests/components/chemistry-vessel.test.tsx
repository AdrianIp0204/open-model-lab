import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChemistryVessel } from "@/components/simulations/primitives/chemistry-vessel";
import type { ChemistryBondedPair, ChemistryParticle } from "@/lib/physics";

describe("ChemistryVessel", () => {
  it("honors custom product tone and shape so the particle field can match the legend", () => {
    const { container } = render(
      <svg>
        <ChemistryVessel
          x={0}
          y={0}
          width={540}
          height={320}
          title="Chemistry bench"
          subtitle="Custom product styling"
          time={1.2}
          agitation={0.9}
          reactantCount={14}
          productCount={7}
          reactantLabel="H+ character"
          productLabel="OH- character"
          reactantTone="coral"
          productTone="sky"
          productShape="square"
          showMixtureBars
        />
      </svg>,
    );

    const productParticles = Array.from(
      container.querySelectorAll('[data-chemistry-particle="product"][data-chemistry-shape="square"] rect'),
    );

    expect(productParticles.length).toBeGreaterThan(0);
    expect(
      productParticles.some((particle) =>
        (particle.getAttribute("fill") ?? "").includes("#4ea6df"),
      ),
    ).toBe(true);
  });

  it("renders bonded product pairs as attached dimers instead of loose overlaps", () => {
    const particles: ChemistryParticle[] = [
      {
        id: "reactant-0",
        species: "reactant",
        x: 84,
        y: 66,
        radius: 5.4,
        streakX: 3.8,
        streakY: 1.1,
      },
    ];
    const bondedPairs: ChemistryBondedPair[] = [
      {
        id: "bond-0",
        memberIds: ["reactant-1", "reactant-2"],
        x: 156,
        y: 78,
        angle: Math.PI / 4,
        separation: 14,
        radius: 5.2,
        streakX: 4.1,
        streakY: 1.4,
        progress: 1,
      },
    ];
    const { container } = render(
      <svg>
        <ChemistryVessel
          x={0}
          y={0}
          width={540}
          height={320}
          title="Reaction bench"
          subtitle="Bonded products"
          time={1.2}
          agitation={1}
          reactantCount={3}
          productCount={1}
          particles={particles}
          bondedPairs={bondedPairs}
          productLabel="Bonded product pairs"
        />
      </svg>,
    );

    const bondedPair = container.querySelector('[data-chemistry-bonded-pair="true"]');

    expect(bondedPair).not.toBeNull();
    expect(
      bondedPair?.getAttribute("data-chemistry-member-ids"),
    ).toBe("reactant-1,reactant-2");
    expect(bondedPair?.querySelectorAll("circle").length).toBeGreaterThanOrEqual(4);
  });
});
