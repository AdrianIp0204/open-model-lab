import { describe, expect, it } from "vitest";
import {
  buildHeatTransferSeries,
  describeHeatTransferState,
  sampleHeatTransferState,
} from "@/lib/physics";

describe("heat-transfer helpers", () => {
  it("strengthens conduction when the contact path improves at the same temperature contrast", () => {
    const weakContact = sampleHeatTransferState({
      hotTemperature: 150,
      ambientTemperature: 25,
      materialConductivity: 0.9,
      contactQuality: 0.15,
      surfaceArea: 1.2,
      airflow: 1,
    });
    const strongContact = sampleHeatTransferState({
      hotTemperature: 150,
      ambientTemperature: 25,
      materialConductivity: 1.8,
      contactQuality: 0.9,
      surfaceArea: 1.2,
      airflow: 1,
    });

    expect(strongContact.temperatureContrast).toBeCloseTo(weakContact.temperatureContrast, 6);
    expect(strongContact.conductionRate).toBeGreaterThan(weakContact.conductionRate * 10);
    expect(strongContact.totalRate).toBeGreaterThan(weakContact.totalRate);
  });

  it("lets airflow change convection much more than conduction", () => {
    const stillAir = sampleHeatTransferState({
      hotTemperature: 120,
      ambientTemperature: 25,
      materialConductivity: 0.8,
      contactQuality: 0.25,
      surfaceArea: 1.3,
      airflow: 0.3,
    });
    const windyAir = sampleHeatTransferState({
      hotTemperature: 120,
      ambientTemperature: 25,
      materialConductivity: 0.8,
      contactQuality: 0.25,
      surfaceArea: 1.3,
      airflow: 2,
    });

    expect(windyAir.convectionRate).toBeGreaterThan(stillAir.convectionRate * 4);
    expect(windyAir.conductionRate).toBeCloseTo(stillAir.conductionRate, 6);
  });

  it("allows radiation to dominate at large temperature contrast when contact and airflow are weak", () => {
    const snapshot = sampleHeatTransferState({
      hotTemperature: 175,
      ambientTemperature: 20,
      materialConductivity: 0.5,
      contactQuality: 0.05,
      surfaceArea: 1.4,
      airflow: 0.3,
    });

    expect(snapshot.radiationRate).toBeGreaterThan(snapshot.conductionRate);
    expect(snapshot.radiationRate).toBeGreaterThan(snapshot.convectionRate);
    expect(snapshot.dominantPathway).toBe("radiation");
  });

  it("cools toward the room so the total rate drops over time", () => {
    const start = sampleHeatTransferState({
      hotTemperature: 150,
      ambientTemperature: 25,
      materialConductivity: 1.8,
      contactQuality: 0.9,
      surfaceArea: 1.2,
      airflow: 1,
    });
    const later = sampleHeatTransferState(
      {
        hotTemperature: 150,
        ambientTemperature: 25,
        materialConductivity: 1.8,
        contactQuality: 0.9,
        surfaceArea: 1.2,
        airflow: 1,
      },
      30,
    );

    expect(later.hotTemperature).toBeLessThan(start.hotTemperature);
    expect(later.temperatureContrast).toBeLessThan(start.temperatureContrast);
    expect(later.totalRate).toBeLessThan(start.totalRate);
    expect(later.totalEnergyTransferred).toBeGreaterThan(0);
  });

  it("builds the expected time and response graph groups", () => {
    const series = buildHeatTransferSeries({
      hotTemperature: 145,
      ambientTemperature: 25,
      materialConductivity: 1.5,
      contactQuality: 0.8,
      surfaceArea: 1.1,
      airflow: 1,
    });

    expect(series["temperature-history"]).toHaveLength(2);
    expect(series["pathway-rates"]).toHaveLength(4);
    expect(series["contact-response"]).toHaveLength(2);
    expect(series["contrast-response"]).toHaveLength(4);
    expect(series["temperature-history"][0]?.points.length).toBeGreaterThan(100);
  });

  it("describes direction and dominant pathway honestly", () => {
    const description = describeHeatTransferState(
      {
        hotTemperature: 175,
        ambientTemperature: 20,
        materialConductivity: 0.5,
        contactQuality: 0.05,
        surfaceArea: 1.4,
        airflow: 0.3,
      },
      0,
    );

    expect(description).toContain("temperature contrast");
    expect(description).toContain("conduction");
    expect(description).toContain("radiation");
    expect(description).toMatch(/energy is leaving the hotter block|radiation is strongest/i);
  });
});
