import { describe, expect, it } from "vitest";
import enMessages from "@/messages/en.json";
import zhHkMessages from "@/messages/zh-HK.json";

const cjkPattern = /[\u3400-\u9fff]/u;

describe("zh-HK onboarding help copy", () => {
  it("covers the onboarding help pages and steps instead of falling back to English", () => {
    expect(Object.keys(zhHkMessages.OnboardingHelp.pages)).toEqual(
      Object.keys(enMessages.OnboardingHelp.pages),
    );
    expect(Object.keys(zhHkMessages.OnboardingHelp.steps)).toEqual(
      Object.keys(enMessages.OnboardingHelp.steps),
    );

    expect(zhHkMessages.OnboardingHelp.prompt.title).not.toBe(
      enMessages.OnboardingHelp.prompt.title,
    );
    expect(zhHkMessages.OnboardingHelp.panel.hintsTitle).not.toBe(
      enMessages.OnboardingHelp.panel.hintsTitle,
    );
    expect(zhHkMessages.OnboardingHelp.pages.circuitBuilder.description).not.toBe(
      enMessages.OnboardingHelp.pages.circuitBuilder.description,
    );
    expect(zhHkMessages.OnboardingHelp.pages.default.hints.three).not.toBe(
      enMessages.OnboardingHelp.pages.default.hints.three,
    );
    expect(zhHkMessages.OnboardingHelp.steps.searchResults.body).not.toBe(
      enMessages.OnboardingHelp.steps.searchResults.body,
    );
    expect(zhHkMessages.OnboardingHelp.steps.helpEntry.title).not.toBe(
      enMessages.OnboardingHelp.steps.helpEntry.title,
    );

    expect(cjkPattern.test(zhHkMessages.OnboardingHelp.prompt.title)).toBe(true);
    expect(cjkPattern.test(zhHkMessages.OnboardingHelp.panel.hintsTitle)).toBe(true);
    expect(cjkPattern.test(zhHkMessages.OnboardingHelp.pages.circuitBuilder.description)).toBe(
      true,
    );
    expect(cjkPattern.test(zhHkMessages.OnboardingHelp.pages.default.hints.three)).toBe(true);
    expect(cjkPattern.test(zhHkMessages.OnboardingHelp.steps.searchResults.body)).toBe(true);
    expect(cjkPattern.test(zhHkMessages.OnboardingHelp.steps.helpEntry.title)).toBe(true);
  });
});
