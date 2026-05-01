"use client";

import { previewFeedbackEmail, type FeedbackContext } from "@/lib/feedback";
import { FeedbackCaptureForm } from "@/components/feedback/FeedbackCaptureForm";

const defaultContactFeedbackContext: FeedbackContext = {
  pageType: "contact",
  pagePath: "/contact",
  pageTitle: "Contact",
};

type ContactFormProps = {
  context?: FeedbackContext;
  fallbackEmail?: string;
};

export function ContactForm({
  context = defaultContactFeedbackContext,
  fallbackEmail = previewFeedbackEmail,
}: ContactFormProps) {
  return <FeedbackCaptureForm context={context} fallbackEmail={fallbackEmail} variant="page" />;
}
