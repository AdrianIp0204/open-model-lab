import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import { resolveConceptContentBySlug } from "@/lib/i18n/concept-content";
import {
  buildConceptQuizSession,
  chooseAlternativeFriendlyValue,
  formatPiRadians,
  formatSymbolicFactor,
  getGeneratedQuestionSlotCount,
  isMentalMathFriendlyNumber,
  resolveConceptQuizDefinition,
  simplifyFraction,
} from "@/lib/quiz";

describe("quiz session builder", () => {
  it("supports a generated-only quantitative concept quiz", () => {
    const concept = structuredClone(
      getConceptBySlug("polar-coordinates-radius-and-angle"),
    );

    concept.quickTest = {
      ...concept.quickTest,
      mode: "generated",
      questionCount: 5,
      questions: [],
      templates: [
        {
          id: "exact-angle-radians",
          kind: "exact-angle-radians",
        },
      ],
    };

    const definition = resolveConceptQuizDefinition(concept);
    const session = buildConceptQuizSession(concept, {
      seed: "generated-only",
      locale: "en",
    });

    expect(definition.mode).toBe("generated");
    expect(getGeneratedQuestionSlotCount(definition)).toBe(5);
    expect(session.questions).toHaveLength(5);
    expect(session.questions.every((question) => question.kind === "generated")).toBe(true);
  });

  it("keeps generated questions stable for one seed and varies them across new attempts", () => {
    const concept = getConceptBySlug("escape-velocity");
    const firstSession = buildConceptQuizSession(concept, {
      seed: "escape-seed-a",
      locale: "en",
    });
    const secondSession = buildConceptQuizSession(concept, {
      seed: "escape-seed-a",
      locale: "en",
    });
    const freshSession = buildConceptQuizSession(concept, {
      seed: "escape-seed-b",
      locale: "en",
    });
    const firstGenerated = firstSession.questions.find((question) => question.kind === "generated");
    const secondGenerated = secondSession.questions.find((question) => question.kind === "generated");
    const freshGenerated = freshSession.questions.find((question) => question.kind === "generated");

    expect(firstGenerated).toBeDefined();
    expect(secondGenerated).toBeDefined();
    expect(freshGenerated).toBeDefined();
    expect(secondGenerated).toMatchObject({
      prompt: firstGenerated!.prompt,
      formattedCorrectAnswer: firstGenerated!.formattedCorrectAnswer,
      givens: firstGenerated!.givens,
      parameterSnapshot: firstGenerated!.parameterSnapshot,
    });
    expect(freshGenerated?.prompt).not.toBe(firstGenerated?.prompt);
    expect(freshGenerated?.formattedCorrectAnswer).not.toBe(
      firstGenerated?.formattedCorrectAnswer,
    );
  });

  it("keeps generated answers and distractors synchronized with the generated setup", () => {
    const concept = getConceptBySlug("escape-velocity");
    const session = buildConceptQuizSession(concept, {
      seed: "escape-choices",
      locale: "en",
    });
    const generatedQuestion = session.questions.find((question) => question.kind === "generated")!;
    const correctChoice = generatedQuestion.choices.find(
      (choice) => choice.id === generatedQuestion.correctChoiceId,
    );

    expect(generatedQuestion.givens?.length).toBeGreaterThan(0);
    expect(generatedQuestion.parameterSnapshot).toBeDefined();
    expect(generatedQuestion.choices).toHaveLength(4);
    expect(new Set(generatedQuestion.choices.map((choice) => choice.label)).size).toBe(4);
    expect(generatedQuestion.choices.every((choice) => choice.label.length > 0)).toBe(true);
    expect(correctChoice?.label).toBe(generatedQuestion.formattedCorrectAnswer);
  });

  it("states the full air-column setup for generated resonance calculations", () => {
    const { content: concept } = resolveConceptContentBySlug(
      "resonance-air-columns-open-closed-pipes",
      "en",
    );
    const session = buildConceptQuizSession(concept, {
      seed: "air-column-resonance:en:quiz-attempt:1",
      locale: "en",
    });
    const generatedQuestion = session.questions.find(
      (question) => question.templateId === "worked-example:allowed-frequency",
    );

    expect(generatedQuestion).toBeDefined();
    expect(generatedQuestion?.prompt).toMatch(/(?:open-open|closed-open) tube/u);
    expect(generatedQuestion?.prompt).toContain("v = 34");
    expect(generatedQuestion?.prompt).toContain("choose the result that fits.");
  });

  it("keeps generated worked-example feedback readable without markdown syntax", () => {
    const concept = getConceptBySlug("sound-waves-longitudinal-motion");
    const session = buildConceptQuizSession(concept, {
      seed: "sound-readable-feedback",
      locale: "en",
    });
    const generatedQuestion = session.questions.find(
      (question) => question.templateId === "worked-example:sound-travel-timing",
    );

    expect(generatedQuestion).toBeDefined();
    expect(generatedQuestion?.prompt).toContain("v_wave =");
    expect(generatedQuestion?.prompt).toContain("probe at x_p");
    expect(generatedQuestion?.prompt).toContain("Choose the result that fits.");
    expect(generatedQuestion?.prompt).not.toContain("For this generated setup");
    expect(generatedQuestion?.explanation).toContain("1. Start from the wave timing relations");
    expect(generatedQuestion?.explanation).toContain("f = v_wave / λ");
    expect(generatedQuestion?.explanation).toContain("Δt = x_p / v_wave");
    expect(generatedQuestion?.explanation).not.toContain("**");
    expect(generatedQuestion?.formattedCorrectAnswer).toMatch(/^f = .* Hz, Δt = .* s$/u);
  });

  it("asks generated pitch/loudness worked examples for the result, not a repeated given", () => {
    const { content: concept } = resolveConceptContentBySlug(
      "pitch-frequency-loudness-intensity",
      "en",
    );
    const session = buildConceptQuizSession(concept, {
      seed: "pitch-frequency-loudness-intensity:en:quiz-attempt:1",
      locale: "en",
    });
    const pitchQuestion = session.questions.find(
      (question) => question.templateId === "worked-example:pitch-from-frequency",
    );
    const loudnessQuestion = session.questions.find(
      (question) => question.templateId === "worked-example:loudness-from-amplitude",
    );

    expect(pitchQuestion).toBeDefined();
    expect(loudnessQuestion).toBeDefined();
    expect(pitchQuestion?.parameterSnapshot).toMatchObject({ answerSource: "result" });
    expect(loudnessQuestion?.parameterSnapshot).toMatchObject({ answerSource: "result" });
    expect(loudnessQuestion?.prompt).toMatch(/Choose the result that fits\./u);
    expect(loudnessQuestion?.prompt).not.toContain("value matches Amplitude");
    expect(loudnessQuestion?.formattedCorrectAnswer).toContain("I_{cue}");
    expect(pitchQuestion?.explanation).not.toMatch(/\b1 cycles\b/u);
    expect(pitchQuestion?.explanation).not.toMatch(/live values|Current pitch/u);
    expect(loudnessQuestion?.explanation).not.toMatch(/live amplitude|Current intensity/u);
  });

  it("keeps localized worked-example generated prompts in the selected locale", () => {
    const { content: concept } = resolveConceptContentBySlug(
      "pitch-frequency-loudness-intensity",
      "zh-HK",
    );
    const session = buildConceptQuizSession(concept, {
      seed: "pitch-frequency-loudness-intensity:zh-HK:quiz-attempt:1",
      locale: "zh-HK",
    });
    const loudnessQuestion = session.questions.find(
      (question) => question.templateId === "worked-example:loudness-from-amplitude",
    );

    expect(loudnessQuestion?.parameterSnapshot).toMatchObject({ answerSource: "result" });
    expect(loudnessQuestion?.prompt).toContain("生成的聲音設定");
    expect(loudnessQuestion?.prompt).toContain("選出相符的結果。");
    expect(loudnessQuestion?.prompt).not.toMatch(/Choose the result|value matches/u);
    expect(loudnessQuestion?.explanation).toContain("這個工作台使用");
    expect(loudnessQuestion?.explanation).not.toMatch(/This bench uses|If frequency stays fixed/u);
  });

  it("keeps beats generated feedback scoped to the setup and readable at zero beat rate", () => {
    const { content: englishConcept } = resolveConceptContentBySlug("beats", "en");
    const englishSession = buildConceptQuizSession(englishConcept, {
      seed: "beats:en:quiz-attempt:1",
      locale: "en",
    });
    const englishQuestion = englishSession.questions.find(
      (question) => question.templateId === "worked-example:beat-rate-from-frequencies",
    );

    expect(englishQuestion).toBeDefined();
    expect(englishQuestion?.prompt).toContain("For this beat setup");
    expect(englishQuestion?.prompt).not.toMatch(/current sources|live bench/u);
    expect(englishQuestion?.explanation).toContain("2. Substitute the setup source pair");
    expect(englishQuestion?.explanation).toContain("there is no separate beat period");
    expect(englishQuestion?.explanation).not.toMatch(/steady\s*s|live source pair|Current beat/u);

    const { content: localizedConcept } = resolveConceptContentBySlug("beats", "zh-HK");
    const localizedSession = buildConceptQuizSession(localizedConcept, {
      seed: "beats:en:quiz-attempt:1",
      locale: "zh-HK",
    });
    const localizedQuestion = localizedSession.questions.find(
      (question) => question.templateId === "worked-example:beat-rate-from-frequencies",
    );

    expect(localizedQuestion).toBeDefined();
    expect(localizedQuestion?.prompt).toContain("生成拍頻設定");
    expect(localizedQuestion?.prompt).toContain("選出相符的結果。");
    expect(localizedQuestion?.explanation).toContain("2. 代入設定中的來源對");
    expect(localizedQuestion?.explanation).toContain("沒有單獨的拍頻週期");
    expect(localizedQuestion?.explanation).not.toMatch(
      /Choose the result|steady\s*s|live source pair|Use \$f_\{beat\}|So the envelope/u,
    );
  });

  it("keeps Doppler generated feedback setup-scoped and localized", () => {
    const { content: englishConcept } = resolveConceptContentBySlug("doppler-effect", "en");
    const englishSession = buildConceptQuizSession(englishConcept, {
      seed: "doppler-effect:en:quiz-attempt:1",
      locale: "en",
    });
    const englishSpacingQuestion = englishSession.questions.find(
      (question) => question.templateId === "worked-example:front-vs-rear-spacing",
    );

    expect(englishSpacingQuestion).toBeDefined();
    expect(englishSpacingQuestion?.prompt).toContain("moving-source setup");
    expect(englishSpacingQuestion?.prompt).not.toMatch(/current source|moving-source bench/u);
    expect(englishSpacingQuestion?.explanation).toContain("2. Substitute the setup source values");
    expect(englishSpacingQuestion?.explanation).toContain(
      "front wavefront spacing is compressed while the rear spacing stretches",
    );
    expect(englishSpacingQuestion?.explanation).not.toMatch(/Listening ahead|Listening behind/u);

    const { content: localizedConcept } = resolveConceptContentBySlug(
      "doppler-effect",
      "zh-HK",
    );
    const localizedSession = buildConceptQuizSession(localizedConcept, {
      seed: "doppler-effect:zh-HK:quiz-attempt:1",
      locale: "zh-HK",
    });
    const localizedSpacingQuestion = localizedSession.questions.find(
      (question) => question.templateId === "worked-example:front-vs-rear-spacing",
    );
    const localizedHeardPitchQuestion = localizedSession.questions.find(
      (question) => question.templateId === "worked-example:heard-frequency-from-motion",
    );

    expect(localizedSpacingQuestion).toBeDefined();
    expect(localizedSpacingQuestion?.prompt).toContain("移動聲源設定");
    expect(localizedSpacingQuestion?.prompt).toContain("選出相符的結果。");
    expect(localizedSpacingQuestion?.explanation).toContain("2. 代入設定中的聲源數值");
    expect(localizedSpacingQuestion?.explanation).toContain("前方間距壓縮到");
    expect(localizedSpacingQuestion?.choices.map((choice) => choice.label).join(" ")).toContain(
      "前方間距",
    );
    expect(localizedSpacingQuestion?.choices.map((choice) => choice.label).join(" ")).toContain(
      "後方間距",
    );
    expect(localizedSpacingQuestion?.choices.map((choice) => choice.label).join(" ")).not.toMatch(
      /ahead|behind/u,
    );
    expect(localizedSpacingQuestion?.explanation).not.toMatch(
      /Use \$\\lambda|The source|Listening behind|current source|ahead|behind/u,
    );
    expect(localizedHeardPitchQuestion?.prompt).not.toMatch(/ahead|behind|搬運來源/u);
    expect(localizedHeardPitchQuestion?.givens?.map((given) => given.label)).toEqual(
      expect.arrayContaining(["聲源頻率", "觀察者速度（朝向為正）"]),
    );
    expect(localizedHeardPitchQuestion?.givens?.map((given) => given.label).join(" ")).not.toMatch(
      /Observer speed|Chosen-side spacing|Observed frequency/u,
    );
    expect(localizedHeardPitchQuestion?.explanation).toContain("在所選側面使用");
    expect(localizedHeardPitchQuestion?.explanation).not.toMatch(
      /Start from the chosen-side relation|The observer is hearing/u,
    );
  });

  it("keeps wave interference zh-HK quick-test copy and generated feedback physics-correct", () => {
    const { content: localizedConcept } = resolveConceptContentBySlug(
      "wave-interference",
      "zh-HK",
    );
    const darkOverlapQuestion = localizedConcept.quickTest.questions.find(
      (question) => question.id === "wave-qt-2",
    );
    const unequalAmplitudeQuestion = localizedConcept.quickTest.questions.find(
      (question) => question.id === "wave-qt-3",
    );
    const shortWavelengthQuestion = localizedConcept.quickTest.questions.find(
      (question) => question.id === "wave-qt-4",
    );

    expect(localizedConcept.title).toBe("波干涉");
    expect(darkOverlapQuestion?.choices[0]?.label).toContain("相反相位");
    expect(darkOverlapQuestion?.choices[0]?.label).not.toContain("同相位");
    expect(unequalAmplitudeQuestion?.prompt).not.toMatch(/Source|null/u);
    expect(unequalAmplitudeQuestion?.choices.map((choice) => choice.label).join(" ")).not.toMatch(
      /Source|null/u,
    );
    expect(shortWavelengthQuestion?.choices[2]?.label).toContain("完全消失");
    expect(shortWavelengthQuestion?.choices[2]?.label).not.toContain("更密");
    expect(shortWavelengthQuestion?.selectedWrongExplanations?.c).toContain("不會把圖樣平均掉");

    const localizedSession = buildConceptQuizSession(localizedConcept, {
      seed: "wave-interference:zh-HK:quiz-attempt:1",
      locale: "zh-HK",
    });
    const localizedPhaseQuestion = localizedSession.questions.find(
      (question) => question.templateId === "worked-example:path-to-phase",
    );

    expect(localizedPhaseQuestion).toBeDefined();
    expect(localizedPhaseQuestion?.prompt).toContain("生成設定");
    expect(localizedPhaseQuestion?.givens?.map((given) => given.label)).toEqual(
      expect.arrayContaining(["探針高度", "波長", "源相位偏移"]),
    );
    expect(localizedPhaseQuestion?.explanation).toContain("使用 $\\Delta \\phi");
    expect(localizedPhaseQuestion?.explanation).toContain("包裹後的相位差");
    expect(localizedPhaseQuestion?.explanation).toContain("探針位於暗區域");
    expect(localizedPhaseQuestion?.explanation).not.toMatch(
      /Use \$|That gives|phase difference is close|source phase offset|extra travel/u,
    );
  });

  it("keeps standing waves zh-HK quick-test copy and generated feedback localized", () => {
    const { content: localizedConcept } = resolveConceptContentBySlug("standing-waves", "zh-HK");
    const nodeQuestion = localizedConcept.quickTest.questions.find(
      (question) => question.id === "standing-qt-1",
    );
    const graphQuestion = localizedConcept.quickTest.questions.find(
      (question) => question.id === "standing-qt-2",
    );
    const higherModeQuestion = localizedConcept.quickTest.questions.find(
      (question) => question.id === "standing-qt-4",
    );

    expect(localizedConcept.title).toBe("駐波");
    expect(localizedConcept.quickTest.intro).toContain("圖像和干涉概念");
    expect(nodeQuestion?.prompt).toContain("一位學生說");
    expect(nodeQuestion?.choices[0]?.label).toContain("干涉抵消點");
    expect(graphQuestion?.choices[1]?.label).toContain("圖像");
    expect(higherModeQuestion?.choices[2]?.label).toContain("額外的波腹");
    expect(JSON.stringify(localizedConcept.quickTest)).not.toMatch(
      /幹|區域性|影像|模式數字|能-fit|絃|説|凍結|半波段/u,
    );

    const localizedSession = buildConceptQuizSession(localizedConcept, {
      seed: "standing-waves:zh-HK:quiz-attempt:1",
      locale: "zh-HK",
    });
    const localizedGeneratedQuestion = localizedSession.questions.find((question) =>
      question.templateId?.startsWith("worked-example:"),
    );

    expect(localizedGeneratedQuestion).toBeDefined();
    expect(localizedGeneratedQuestion?.prompt).toContain("生成設定");
    expect(localizedGeneratedQuestion?.givens?.map((given) => given.label)).toEqual(
      expect.arrayContaining(["模式數", "弦長"]),
    );
    expect(localizedGeneratedQuestion?.explanation).toMatch(
      /固定兩端的弦可用|使用 \$y\(x,t\)/u,
    );
    expect(localizedGeneratedQuestion?.explanation).toMatch(/節點間距|局部包絡/u);
    expect(localizedGeneratedQuestion?.explanation).not.toMatch(
      /For a string|That gives|Raising the mode number|current standing wave|node spacing|Mode number|String length|Use \$/u,
    );
  });

  it("keeps uniform circular motion zh-HK quick-test copy and generated feedback localized", () => {
    const { content: localizedConcept } = resolveConceptContentBySlug(
      "uniform-circular-motion",
      "zh-HK",
    );

    expect(localizedConcept.title).toBe("均速圓周運動");
    expect(JSON.stringify(localizedConcept.quickTest)).not.toMatch(
      /影像|均勻圓周運動|速度值|圓週|投射|設定 B有/u,
    );

    const localizedSession = buildConceptQuizSession(localizedConcept, {
      seed: "uniform-circular-motion:zh-HK:quiz-attempt:1",
      locale: "zh-HK",
    });
    const localizedProjectionQuestion = localizedSession.questions.find(
      (question) => question.templateId === "worked-example:current-x-projection",
    );

    expect(localizedProjectionQuestion).toBeDefined();
    expect(localizedProjectionQuestion?.prompt).toContain("對於當前狀態");
    expect(localizedProjectionQuestion?.prompt).toContain("選出相符的結果。");
    expect(localizedProjectionQuestion?.givens?.map((given) => given.label)).toEqual(
      expect.arrayContaining(["時間", "半徑", "角速度", "相位"]),
    );
    expect(localizedProjectionQuestion?.explanation).toContain("使用圓周運動的水平投影關係");
    expect(localizedProjectionQuestion?.explanation).toContain("目前角度為");
    expect(localizedProjectionQuestion?.explanation).toContain("投影表示粒子位於軌道");
    expect(localizedProjectionQuestion?.explanation).not.toMatch(
      /Use the horizontal|The current angle|The negative x projection|The positive x projection|Time|Phase/u,
    );
  });

  it("preserves symbolic pi formatting for exact-angle generated questions", () => {
    const concept = getConceptBySlug("polar-coordinates-radius-and-angle");
    const session = buildConceptQuizSession(concept, {
      seed: "symbolic-pi",
      locale: "en",
    });
    const symbolicQuestion = session.questions.find(
      (question) => question.templateId === "exact-angle-radians",
    );

    expect(symbolicQuestion).toBeDefined();
    expect(symbolicQuestion?.formattedCorrectAnswer).toContain("π");
    expect(symbolicQuestion?.formattedCorrectAnswer).not.toMatch(/\d+\.\d+/);
  });

  it("keeps the numeric helper on clean, mental-math-friendly values", () => {
    const nextValue = chooseAlternativeFriendlyValue({
      min: 1,
      max: 12,
      step: 0.5,
      current: 4,
      presetValues: [2, 3, 5, 8],
      offset: 0,
    });

    expect(nextValue).not.toBeNull();
    expect(isMentalMathFriendlyNumber(nextValue!)).toBe(true);
  });

  it("formats symbolic constants instead of flattening them to decimals", () => {
    expect(simplifyFraction({ numerator: 6, denominator: 8 })).toEqual({
      numerator: 3,
      denominator: 4,
    });
    expect(formatPiRadians({ numerator: 2, denominator: 1 })).toBe("2π");
    expect(formatPiRadians({ numerator: 1, denominator: 2 })).toBe("π/2");
    expect(formatSymbolicFactor({ numerator: 3, symbol: "g" })).toBe("3g");
    expect(formatSymbolicFactor({ numerator: 1, denominator: 2, symbol: "k" })).toBe("k/2");
  });
});
