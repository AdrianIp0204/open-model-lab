// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({
    children,
    feedbackContext,
    sectionNav,
  }: {
    children: ReactNode;
    feedbackContext?: { pageTitle: string };
    sectionNav?: {
      label: string;
      title: string;
      mobileLabel: string;
      items: Array<{ id: string; label: string; compactLabel: string }>;
    };
  }) => (
    <div>
      <div data-testid="feedback-title">{feedbackContext?.pageTitle}</div>
      <nav aria-label={sectionNav?.label}>
        <p>{sectionNav?.title}</p>
        <p>{sectionNav?.mobileLabel}</p>
        <ul>
          {sectionNav?.items.map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              <span>{item.compactLabel}</span>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  ),
}));

vi.mock("@/components/layout/SectionHeading", () => ({
  SectionHeading: ({
    eyebrow,
    title,
    description,
  }: {
    eyebrow: string;
    title: string;
    description: string;
  }) => (
    <header>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));

vi.mock("@/components/concepts/ContactForm", () => ({
  ContactForm: ({ fallbackEmail }: { fallbackEmail: string }) => (
    <div data-testid="contact-form">{fallbackEmail}</div>
  ),
}));

vi.mock("@/components/layout/PageSection", () => ({
  PageSection: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/motion", () => ({
  MotionSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ContactPage from "@/app/contact/ContactRoute";

describe("ContactPage", () => {
  it("renders localized zh-HK contact copy from the active locale", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(await ContactPage());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/[\u4e00-\u9fff]{2,}/);
    expect(screen.getByTestId("feedback-title")).toHaveTextContent(/[\u4e00-\u9fff]{2,}/);
    expect(screen.getByRole("navigation", { name: /[\u4e00-\u9fff]{2,}/ })).toBeInTheDocument();
    expect(screen.getAllByText(/[\u4e00-\u9fff]{2,}/).length).toBeGreaterThan(3);
    expect(
      screen.queryByText(/send feedback without an account, analytics sprawl, or a support maze/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/what to send/i)).not.toBeInTheDocument();
  });
});
