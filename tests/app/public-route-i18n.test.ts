// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { generateMetadata as generateLocalizedAboutMetadata } from "@/app/[locale]/about/page";
import { generateMetadata as generateLocalizedAdsMetadata } from "@/app/[locale]/ads/page";
import { generateMetadata as generateLocalizedChemistryReactionMindMapMetadata } from "@/app/[locale]/tools/chemistry-reaction-mind-map/page";
import { generateMetadata as generateLocalizedCircuitBuilderMetadata } from "@/app/[locale]/circuit-builder/page";
import { generateMetadata as generateLocalizedConceptMetadata } from "@/app/[locale]/concepts/[slug]/page";
import { generateMetadata as generateLocalizedConceptsMetadata } from "@/app/[locale]/concepts/page";
import { generateMetadata as generateLocalizedSubjectDetailMetadata } from "@/app/[locale]/concepts/subjects/[slug]/page";
import { generateMetadata as generateLocalizedSubjectsMetadata } from "@/app/[locale]/concepts/subjects/page";
import { generateMetadata as generateLocalizedTopicDetailMetadata } from "@/app/[locale]/concepts/topics/[slug]/page";
import { generateMetadata as generateLocalizedTopicsMetadata } from "@/app/[locale]/concepts/topics/page";
import { generateMetadata as generateLocalizedGuidedMetadata } from "@/app/[locale]/guided/page";
import { generateMetadata as generateLocalizedHomeMetadata } from "@/app/[locale]/page";
import { generateMetadata as generateLocalizedPricingMetadata } from "@/app/[locale]/pricing/page";
import { generateMetadata as generateLocalizedPrivacyMetadata } from "@/app/[locale]/privacy/page";
import { generateMetadata as generateLocalizedSearchMetadata } from "@/app/[locale]/search/page";
import { generateMetadata as generateLocalizedTermsMetadata } from "@/app/[locale]/terms/page";
import { generateMetadata as generateLocalizedTestsMetadata } from "@/app/[locale]/tests/page";
import { generateMetadata as generateLocalizedToolsMetadata } from "@/app/[locale]/tools/page";
import { generateMetadata as generateLocalizedPackTestMetadata } from "@/app/[locale]/tests/packs/[slug]/page";
import { generateMetadata as generateLocalizedTopicTestMetadata } from "@/app/[locale]/tests/topics/[slug]/page";
import { generateMetadata as generateLocalizedTrackCompletionMetadata } from "@/app/[locale]/tracks/[slug]/complete/page";
import { generateMetadata as generateAdsMetadata } from "@/app/ads/page";
import { generateMetadata as generateChemistryReactionMindMapMetadata } from "@/app/tools/chemistry-reaction-mind-map/page";
import { generateMetadata as generateCircuitBuilderMetadata } from "@/app/circuit-builder/page";
import { generateMetadata as generateConceptsMetadata } from "@/app/concepts/page";
import { generateMetadata as generateSubjectDetailMetadata } from "@/app/concepts/subjects/[slug]/page";
import { generateMetadata as generateSubjectsMetadata } from "@/app/concepts/subjects/page";
import { generateMetadata as generateTopicDetailMetadata } from "@/app/concepts/topics/[slug]/page";
import { generateMetadata as generateTopicsMetadata } from "@/app/concepts/topics/page";
import { generateMetadata as generateGuidedMetadata } from "@/app/guided/page";
import { generateMetadata as generateHomeMetadata } from "@/app/_localized/home-page";
import { generateMetadata as generatePricingMetadata } from "@/app/pricing/page";
import { generateMetadata as generatePrivacyMetadata } from "@/app/privacy/page";
import { generateMetadata as generateSearchMetadata } from "@/app/search/page";
import { generateMetadata as generateTermsMetadata } from "@/app/terms/page";
import { generateMetadata as generateTestsMetadata } from "@/app/tests/page";
import { generateMetadata as generateToolsMetadata } from "@/app/tools/page";
import { generateMetadata as generatePackTestMetadata } from "@/app/tests/packs/[slug]/page";
import { generateMetadata as generateTopicTestMetadata } from "@/app/tests/topics/[slug]/page";
import { generateMetadata as generateTrackCompletionMetadata } from "@/app/tracks/[slug]/complete/page";
import zhHkMessages from "@/messages/zh-HK.json";

describe("public route i18n metadata", () => {
  beforeEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("keeps English public route metadata on locale-prefixed canonicals", async () => {
    globalThis.__TEST_LOCALE__ = "en";

    const [homeMetadata, conceptsMetadata, searchMetadata, testsMetadata, packTestMetadata, topicTestMetadata, subjectsMetadata, subjectDetailMetadata, topicsMetadata, topicDetailMetadata, guidedMetadata, circuitBuilderMetadata, toolsMetadata, chemistryReactionMindMapMetadata, trackCompletionMetadata, pricingMetadata, privacyMetadata, termsMetadata, adsMetadata] =
      await Promise.all([
      generateHomeMetadata(),
      generateConceptsMetadata(),
      generateSearchMetadata(),
      generateTestsMetadata(),
      generatePackTestMetadata({
        params: Promise.resolve({ slug: "physics-connected-models" }),
      }),
      generateTopicTestMetadata({
        params: Promise.resolve({ slug: "circuits" }),
      }),
      generateSubjectsMetadata(),
      generateSubjectDetailMetadata({
        params: Promise.resolve({ slug: "physics" }),
      }),
      generateTopicsMetadata(),
      generateTopicDetailMetadata({
        params: Promise.resolve({ slug: "mechanics" }),
      }),
      generateGuidedMetadata(),
      generateCircuitBuilderMetadata(),
      generateToolsMetadata(),
      generateChemistryReactionMindMapMetadata(),
      generateTrackCompletionMetadata({
        params: Promise.resolve({ slug: "motion-and-circular-motion" }),
      }),
      generatePricingMetadata(),
      generatePrivacyMetadata(),
      generateTermsMetadata(),
      generateAdsMetadata(),
    ]);

    expect(homeMetadata.alternates?.canonical).toContain("/en");
    expect(conceptsMetadata.alternates?.canonical).toContain("/en/concepts");
    expect(searchMetadata.alternates?.canonical).toContain("/en/search");
    expect(testsMetadata.alternates?.canonical).toContain("/en/tests");
    expect(packTestMetadata.alternates?.canonical).toContain(
      "/en/tests/packs/physics-connected-models",
    );
    expect(topicTestMetadata.alternates?.canonical).toContain("/en/tests/topics/circuits");
    expect(subjectsMetadata.alternates?.canonical).toContain("/en/concepts/subjects");
    expect(subjectDetailMetadata.alternates?.canonical).toContain(
      "/en/concepts/subjects/physics",
    );
    expect(topicsMetadata.alternates?.canonical).toContain("/en/concepts/topics");
    expect(topicDetailMetadata.alternates?.canonical).toContain(
      "/en/concepts/topics/mechanics",
    );
    expect(guidedMetadata.alternates?.canonical).toContain("/en/guided");
    expect(circuitBuilderMetadata.alternates?.canonical).toContain("/en/circuit-builder");
    expect(toolsMetadata.alternates?.canonical).toContain("/en/tools");
    expect(chemistryReactionMindMapMetadata.alternates?.canonical).toContain(
      "/en/tools/chemistry-reaction-mind-map",
    );
    expect(trackCompletionMetadata.alternates?.canonical).toContain(
      "/en/tracks/motion-and-circular-motion/complete",
    );
    expect(pricingMetadata.alternates?.canonical).toContain("/en/pricing");
    expect(privacyMetadata.alternates?.canonical).toContain("/en/privacy");
    expect(termsMetadata.alternates?.canonical).toContain("/en/terms");
    expect(adsMetadata.alternates?.canonical).toContain("/en/ads");
  });

  it("localizes major public route metadata in zh-HK", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const [homeMetadata, conceptsMetadata, searchMetadata, testsMetadata, packTestMetadata, topicTestMetadata, subjectsMetadata, subjectDetailMetadata, topicsMetadata, topicDetailMetadata, guidedMetadata, circuitBuilderMetadata, toolsMetadata, chemistryReactionMindMapMetadata, trackCompletionMetadata, pricingMetadata, privacyMetadata, termsMetadata, adsMetadata] =
      await Promise.all([
      generateHomeMetadata(),
      generateConceptsMetadata(),
      generateSearchMetadata(),
      generateTestsMetadata(),
      generatePackTestMetadata({
        params: Promise.resolve({ slug: "physics-connected-models" }),
      }),
      generateTopicTestMetadata({
        params: Promise.resolve({ slug: "circuits" }),
      }),
      generateSubjectsMetadata(),
      generateSubjectDetailMetadata({
        params: Promise.resolve({ slug: "physics" }),
      }),
      generateTopicsMetadata(),
      generateTopicDetailMetadata({
        params: Promise.resolve({ slug: "mechanics" }),
      }),
      generateGuidedMetadata(),
      generateCircuitBuilderMetadata(),
      generateToolsMetadata(),
      generateChemistryReactionMindMapMetadata(),
      generateTrackCompletionMetadata({
        params: Promise.resolve({ slug: "motion-and-circular-motion" }),
      }),
      generatePricingMetadata(),
      generatePrivacyMetadata(),
      generateTermsMetadata(),
      generateAdsMetadata(),
    ]);

    expect(homeMetadata.title).toEqual({
      absolute: zhHkMessages.HomePage.metadata.absoluteTitle,
    });
    expect(homeMetadata.alternates?.canonical).toContain("/zh-HK");
    expect(homeMetadata.openGraph?.locale).toBe("zh_HK");
    expect(conceptsMetadata.title).toBe(zhHkMessages.ConceptsPage.metadata.title);
    expect(conceptsMetadata.description).toBe(
      zhHkMessages.ConceptsPage.metadata.description,
    );
    expect(searchMetadata.title).toBe(zhHkMessages.SearchRoute.metadata.title);
    expect(searchMetadata.description).toBe(
      zhHkMessages.SearchRoute.metadata.description,
    );
    expect(testsMetadata.title).toBe(zhHkMessages.TestHubPage.metadata.title);
    expect(testsMetadata.description).toBe(
      zhHkMessages.TestHubPage.metadata.description,
    );
    expect(packTestMetadata.description).toBe(
      zhHkMessages.PackTestPage.metadata.description.replace(
        "{title}",
        "Physics Connections Pack",
      ),
    );
    expect(topicTestMetadata.title).toBe(
      zhHkMessages.TopicTestPage.metadata.title.replace("{topic}", "Circuits"),
    );
    expect(subjectsMetadata.title).toBe(zhHkMessages.SubjectDirectoryPage.metadata.title);
    expect(subjectsMetadata.description).toBe(
      zhHkMessages.SubjectDirectoryPage.metadata.description,
    );
    expect(subjectDetailMetadata.title).toBe("物理 概念與路徑");
    expect(subjectDetailMetadata.description).toBe(
      "透過運動、重力、波動、聲音、電場、電路、光學與現代物理的即時實驗台進入目前的物理內容。",
    );
    expect(topicsMetadata.title).toBe(zhHkMessages.TopicDirectoryPage.metadata.title);
    expect(topicsMetadata.description).toBe(
      zhHkMessages.TopicDirectoryPage.metadata.description,
    );
    expect(topicDetailMetadata.title).toBe("力學 概念");
    expect(topicDetailMetadata.description).toBe(
      "用向量、軌跡、圓周運動、轉動效應、動量與碰撞，在同一條精簡的模擬分支裡理解運動與交互作用。",
    );
    expect(guidedMetadata.title).toBe(zhHkMessages.GuidedCollectionsPage.metadata.title);
    expect(guidedMetadata.description).toBe(
      zhHkMessages.GuidedCollectionsPage.metadata.description,
    );
    expect(circuitBuilderMetadata.title).toBe(zhHkMessages.CircuitBuilderRoute.metadata.title);
    expect(circuitBuilderMetadata.description).toBe(
      zhHkMessages.CircuitBuilderRoute.metadata.description,
    );
    expect(circuitBuilderMetadata.alternates?.canonical).toContain("/zh-HK/circuit-builder");
    expect(toolsMetadata.title).toBe(zhHkMessages.ToolsDirectoryPage.metadata.title);
    expect(toolsMetadata.description).toBe(zhHkMessages.ToolsDirectoryPage.metadata.description);
    expect(toolsMetadata.alternates?.canonical).toContain("/zh-HK/tools");
    expect(chemistryReactionMindMapMetadata.title).toBe(
      zhHkMessages.ChemistryReactionMindMapPage.metadata.title,
    );
    expect(chemistryReactionMindMapMetadata.description).toBe(
      zhHkMessages.ChemistryReactionMindMapPage.metadata.description,
    );
    expect(chemistryReactionMindMapMetadata.alternates?.canonical).toContain(
      "/zh-HK/tools/chemistry-reaction-mind-map",
    );
    expect(trackCompletionMetadata.title).toBe("運動與圓周運動 路徑完成回顧");
    expect(trackCompletionMetadata.description).toBe(
      "回顧 運動與圓周運動 涵蓋的內容，查看你在這條路徑完成的概念，並選擇下一個清楚的步驟。",
    );
    expect(trackCompletionMetadata.alternates?.canonical).toContain(
      "/zh-HK/tracks/motion-and-circular-motion/complete",
    );
    expect(pricingMetadata.title).toBe(zhHkMessages.PricingPage.metadata.title);
    expect(pricingMetadata.alternates?.canonical).toContain("/zh-HK/pricing");
    expect(privacyMetadata.title).toBe(zhHkMessages.PrivacyPage.metadata.title);
    expect(privacyMetadata.alternates?.canonical).toContain("/zh-HK/privacy");
    expect(termsMetadata.title).toBe(zhHkMessages.TermsPage.metadata.title);
    expect(termsMetadata.alternates?.canonical).toContain("/zh-HK/terms");
    expect(adsMetadata.title).toBe("廣告與贊助");
    expect(adsMetadata.alternates?.canonical).toContain("/zh-HK/ads");
  });

  it("uses locale params for locale-prefixed wrapper metadata", async () => {
    globalThis.__TEST_LOCALE__ = "en";

    const [
      homeMetadata,
      aboutMetadata,
      chemistryReactionMindMapMetadata,
      circuitBuilderMetadata,
      conceptsMetadata,
      pricingMetadata,
      privacyMetadata,
      searchMetadata,
      subjectsMetadata,
      subjectDetailMetadata,
      termsMetadata,
      topicsMetadata,
      topicDetailMetadata,
      guidedMetadata,
      testsMetadata,
      toolsMetadata,
      adsMetadata,
      conceptMetadata,
      topicTestMetadata,
      packTestMetadata,
      trackCompletionMetadata,
    ] =
      await Promise.all([
        generateLocalizedHomeMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedAboutMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedChemistryReactionMindMapMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedCircuitBuilderMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedConceptsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedPricingMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedPrivacyMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedSearchMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedSubjectsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedSubjectDetailMetadata({
          params: Promise.resolve({ locale: "zh-HK", slug: "physics" }),
        }),
        generateLocalizedTermsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedTopicsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedTopicDetailMetadata({
          params: Promise.resolve({ locale: "zh-HK", slug: "mechanics" }),
        }),
        generateLocalizedGuidedMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedTestsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedToolsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedAdsMetadata({
          params: Promise.resolve({ locale: "zh-HK" }),
        }),
        generateLocalizedConceptMetadata({
          params: Promise.resolve({
            locale: "zh-HK",
            slug: "projectile-motion",
          }),
        }),
        generateLocalizedTopicTestMetadata({
          params: Promise.resolve({
            locale: "zh-HK",
            slug: "circuits",
          }),
        }),
        generateLocalizedPackTestMetadata({
          params: Promise.resolve({
            locale: "zh-HK",
            slug: "physics-connected-models",
          }),
        }),
        generateLocalizedTrackCompletionMetadata({
          params: Promise.resolve({
            locale: "zh-HK",
            slug: "motion-and-circular-motion",
          }),
        }),
      ]);

    expect(homeMetadata.title).toEqual({
      absolute: zhHkMessages.HomePage.metadata.absoluteTitle,
    });
    expect(homeMetadata.alternates?.canonical).toContain("/zh-HK");
    expect(homeMetadata.alternates?.languages?.en).toContain("/en");
    expect(homeMetadata.alternates?.languages?.["zh-HK"]).toContain("/zh-HK");
    expect(aboutMetadata.title).toBe(zhHkMessages.AboutPage.metadata.title);
    expect(aboutMetadata.alternates?.canonical).toContain("/zh-HK/about");
    expect(chemistryReactionMindMapMetadata.title).toBe(
      zhHkMessages.ChemistryReactionMindMapPage.metadata.title,
    );
    expect(chemistryReactionMindMapMetadata.alternates?.canonical).toContain(
      "/zh-HK/tools/chemistry-reaction-mind-map",
    );
    expect(chemistryReactionMindMapMetadata.alternates?.languages?.en).toContain(
      "/en/tools/chemistry-reaction-mind-map",
    );
    expect(circuitBuilderMetadata.title).toBe(zhHkMessages.CircuitBuilderRoute.metadata.title);
    expect(circuitBuilderMetadata.description).toBe(
      zhHkMessages.CircuitBuilderRoute.metadata.description,
    );
    expect(circuitBuilderMetadata.alternates?.canonical).toContain("/zh-HK/circuit-builder");
    expect(circuitBuilderMetadata.alternates?.languages?.en).toContain("/en/circuit-builder");
    expect(conceptsMetadata.alternates?.canonical).toContain("/zh-HK/concepts");
    expect(pricingMetadata.title).toBe(zhHkMessages.PricingPage.metadata.title);
    expect(pricingMetadata.alternates?.canonical).toContain("/zh-HK/pricing");
    expect(pricingMetadata.alternates?.languages?.en).toContain("/en/pricing");
    expect(privacyMetadata.title).toBe(zhHkMessages.PrivacyPage.metadata.title);
    expect(privacyMetadata.alternates?.canonical).toContain("/zh-HK/privacy");
    expect(privacyMetadata.alternates?.languages?.en).toContain("/en/privacy");
    expect(searchMetadata.title).toBe(zhHkMessages.SearchRoute.metadata.title);
    expect(searchMetadata.description).toBe(
      zhHkMessages.SearchRoute.metadata.description,
    );
    expect(searchMetadata.alternates?.canonical).toContain("/zh-HK/search");
    expect(searchMetadata.alternates?.languages?.en).toContain("/en/search");
    expect(searchMetadata.alternates?.languages?.["zh-HK"]).toContain("/zh-HK/search");
    expect(searchMetadata.openGraph?.locale).toBe("zh_HK");
    expect(testsMetadata.title).toBe(zhHkMessages.TestHubPage.metadata.title);
    expect(testsMetadata.alternates?.canonical).toContain("/zh-HK/tests");
    expect(testsMetadata.alternates?.languages?.en).toContain("/en/tests");
    expect(toolsMetadata.title).toBe(zhHkMessages.ToolsDirectoryPage.metadata.title);
    expect(toolsMetadata.alternates?.canonical).toContain("/zh-HK/tools");
    expect(toolsMetadata.alternates?.languages?.en).toContain("/en/tools");
    expect(packTestMetadata.alternates?.canonical).toContain(
      "/zh-HK/tests/packs/physics-connected-models",
    );
    expect(packTestMetadata.alternates?.languages?.en).toContain(
      "/en/tests/packs/physics-connected-models",
    );
    expect(packTestMetadata.description).toBe(
      zhHkMessages.PackTestPage.metadata.description.replace(
        "{title}",
        "Physics Connections Pack",
      ),
    );
    expect(termsMetadata.title).toBe(zhHkMessages.TermsPage.metadata.title);
    expect(termsMetadata.alternates?.canonical).toContain("/zh-HK/terms");
    expect(termsMetadata.alternates?.languages?.en).toContain("/en/terms");
    expect(topicTestMetadata.title).toBe(
      zhHkMessages.TopicTestPage.metadata.title.replace("{topic}", "Circuits"),
    );
    expect(topicTestMetadata.alternates?.canonical).toContain("/zh-HK/tests/topics/circuits");
    expect(topicTestMetadata.alternates?.languages?.en).toContain("/en/tests/topics/circuits");
    expect(subjectsMetadata.title).toBe(zhHkMessages.SubjectDirectoryPage.metadata.title);
    expect(subjectsMetadata.alternates?.canonical).toContain("/zh-HK/concepts/subjects");
    expect(subjectsMetadata.alternates?.languages?.en).toContain("/en/concepts/subjects");
    expect(subjectDetailMetadata.title).toBe("物理 概念與路徑");
    expect(subjectDetailMetadata.alternates?.canonical).toContain(
      "/zh-HK/concepts/subjects/physics",
    );
    expect(subjectDetailMetadata.alternates?.languages?.en).toContain(
      "/en/concepts/subjects/physics",
    );
    expect(topicsMetadata.title).toBe(zhHkMessages.TopicDirectoryPage.metadata.title);
    expect(topicsMetadata.alternates?.canonical).toContain("/zh-HK/concepts/topics");
    expect(topicsMetadata.alternates?.languages?.en).toContain("/en/concepts/topics");
    expect(topicDetailMetadata.title).toBe("力學 概念");
    expect(topicDetailMetadata.alternates?.canonical).toContain(
      "/zh-HK/concepts/topics/mechanics",
    );
    expect(topicDetailMetadata.alternates?.languages?.en).toContain(
      "/en/concepts/topics/mechanics",
    );
    expect(guidedMetadata.title).toBe(zhHkMessages.GuidedCollectionsPage.metadata.title);
    expect(guidedMetadata.alternates?.canonical).toContain("/zh-HK/guided");
    expect(guidedMetadata.alternates?.languages?.en).toContain("/en/guided");
    expect(adsMetadata.title).toBe("廣告與贊助");
    expect(adsMetadata.alternates?.canonical).toContain("/zh-HK/ads");
    expect(adsMetadata.alternates?.languages?.en).toContain("/en/ads");
    expect(conceptMetadata.alternates?.canonical).toContain(
      "/zh-HK/concepts/projectile-motion",
    );
    expect(conceptMetadata.alternates?.languages?.en).toContain(
      "/en/concepts/projectile-motion",
    );
    expect(conceptMetadata.alternates?.languages?.["zh-HK"]).toContain(
      "/zh-HK/concepts/projectile-motion",
    );
    expect(conceptMetadata.openGraph?.locale).toBe("zh_HK");
    expect(trackCompletionMetadata.title).toBe("運動與圓周運動 路徑完成回顧");
    expect(trackCompletionMetadata.alternates?.canonical).toContain(
      "/zh-HK/tracks/motion-and-circular-motion/complete",
    );
    expect(trackCompletionMetadata.alternates?.languages?.en).toContain(
      "/en/tracks/motion-and-circular-motion/complete",
    );
    expect(trackCompletionMetadata.alternates?.languages?.["zh-HK"]).toContain(
      "/zh-HK/tracks/motion-and-circular-motion/complete",
    );
    expect(trackCompletionMetadata.openGraph?.locale).toBe("zh_HK");
  });
});
