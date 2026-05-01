import { describe, expect, it } from "vitest";
import { getAllConcepts, getConceptBySlug } from "@/lib/content";
import { localizeConceptContent } from "@/lib/i18n/concept-content";
import { resolveLiveWorkedExample } from "@/lib/learning/liveWorkedExamples";
import { buildConceptQuizSession, resolveConceptQuizDefinition } from "@/lib/quiz";

describe("concept quiz support", () => {
  it("builds at least five quiz questions for every concept page", () => {
    const concepts = getAllConcepts({ includeUnpublished: true });

    for (const concept of concepts) {
      const definition = resolveConceptQuizDefinition(concept);
      const session = buildConceptQuizSession(concept, {
        seed: `content-quiz:${concept.slug}`,
        locale: "en",
      });

      expect(definition.questionCount).toBeGreaterThanOrEqual(5);
      expect(session.questions).toHaveLength(definition.questionCount);
      expect(new Set(session.questions.map((question) => question.canonicalQuestionId)).size).toBe(
        session.questions.length,
      );
    }
  });

  it("keeps the damping and resonance quiz varied and computable", () => {
    const concept = getConceptBySlug("damping-resonance");
    const session = buildConceptQuizSession(concept, {
      seed: "content-quiz:damping-resonance-quality",
      locale: "en",
    });
    const generatedQuestion = session.questions.find(
      (question) => question.kind === "generated",
    );

    expect(generatedQuestion?.templateId).toBe("damping-response-amplitude-template");
    expect(generatedQuestion?.prompt).toContain("steady-state response amplitude");
    expect(generatedQuestion?.givens?.map((given) => given.label)).toEqual([
      "Drive amplitude",
      "Damping ratio",
      "Natural frequency",
      "Driving frequency",
    ]);

    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "a",
      "c",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
  });

  it("keeps the wave speed and wavelength authored answer key from forming a letter pattern", () => {
    const concept = getConceptBySlug("wave-speed-wavelength");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "b",
      "c",
      "a",
      "b",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
  });

  it("keeps the polarization generated setup copy readable", () => {
    const concept = getConceptBySlug("polarization");
    const session = buildConceptQuizSession(concept, {
      seed: "content-quiz:polarization-quality",
      locale: "en",
    });
    const generatedQuestion = session.questions.find(
      (question) => question.kind === "generated",
    );
    const renderedSetup = [
      generatedQuestion?.prompt,
      ...(generatedQuestion?.givens ?? []).map((given) =>
        `${given.symbol ?? given.label} = ${given.value}${given.unit ? ` ${given.unit}` : ""}`,
      ),
    ].join("\n");

    expect(generatedQuestion?.templateId).toBe("worked-example:current-output-state");
    expect(renderedSetup).toContain("state_in =");
    expect(renderedSetup).toContain("θ_in =");
    expect(renderedSetup).not.toContain("mathrm");
    expect(renderedSetup).not.toMatch(/°\s*deg|\bdeg\s+deg\b/);

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhSession = buildConceptQuizSession(zhConcept, {
      seed: "content-quiz:polarization-quality",
      locale: "zh-HK",
    });
    const zhGeneratedQuestion = zhSession.questions.find(
      (question) => question.kind === "generated",
    );
    const zhRenderedSetup = [
      zhGeneratedQuestion?.prompt,
      ...(zhGeneratedQuestion?.givens ?? []).map((given) =>
        `${given.symbol ?? given.label} = ${given.value}${given.unit ? ` ${given.unit}` : ""}`,
      ),
    ].join("\n");

    expect(zhRenderedSetup).toContain("state_in =");
    expect(zhRenderedSetup).toContain("θ_in =");
    expect(zhRenderedSetup).not.toContain("mathrm");
    expect(zhRenderedSetup).not.toMatch(/°\s*deg|\bdeg\s+deg\b/);
  });

  it("keeps the total internal reflection generated checkpoint from giving away the answer", () => {
    const concept = getConceptBySlug("total-internal-reflection");
    const session = buildConceptQuizSession(concept, {
      seed: "content-quiz:total-internal-reflection-quality",
      locale: "en",
    });
    const generatedQuestion = session.questions.find(
      (question) => question.kind === "generated",
    );
    const noThresholdQuestion = resolveConceptQuizDefinition(concept).staticQuestions.find(
      (question) => question.id === "tir-qt-no-threshold",
    );

    expect(generatedQuestion?.templateId).toBe("tir-boundary-state-generated");
    expect(generatedQuestion?.prompt).toContain("has it crossed into total internal reflection");
    expect(generatedQuestion?.prompt).not.toContain("what is its value");
    expect(generatedQuestion?.givens?.map((given) => given.label)).toEqual([
      "Incident angle",
      "Critical angle",
    ]);
    expect(generatedQuestion?.choices.map((choice) => choice.label).join(" ")).not.toContain(
      "theta_c =",
    );
    expect(noThresholdQuestion?.showMeAction?.presetId).toBeUndefined();
    expect(noThresholdQuestion?.showMeAction?.patch).toMatchObject({
      incidentAngle: 70,
      n1: 1,
      n2: 1.52,
    });
  });

  it("keeps the magnetic-force field-strength checkpoint grounded in radius", () => {
    const concept = getConceptBySlug("magnetic-force-moving-charges-currents");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;
    const strongerFieldQuestion = authoredQuestions.find(
      (question) => question.id === "mfmc-qt-stronger-field",
    );

    expect(strongerFieldQuestion?.prompt).toContain("path radius should stay the same");
    expect(strongerFieldQuestion?.choices.find((choice) => choice.id === "a")?.label).toContain(
      "shrinks the orbit radius",
    );
    expect(strongerFieldQuestion?.explanation).toContain("r = mv/(|q|B)");
    expect(strongerFieldQuestion?.explanation).toContain("smaller-radius path");
    expect(
      [
        strongerFieldQuestion?.prompt,
        strongerFieldQuestion?.choices.find((choice) => choice.id === "a")?.label,
        strongerFieldQuestion?.explanation,
        strongerFieldQuestion?.showMeAction?.observationHint,
        ...Object.values(strongerFieldQuestion?.selectedWrongExplanations ?? {}),
      ].join(" "),
    ).not.toMatch(/period|timing|heading rotates|turns through the path|turn more quickly/i);

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;
    const zhStrongerFieldQuestion = zhAuthoredQuestions.find(
      (question) => question.id === "mfmc-qt-stronger-field",
    );

    expect(zhStrongerFieldQuestion?.prompt).toContain("路徑半徑應該保持不變");
    expect(zhStrongerFieldQuestion?.choices.find((choice) => choice.id === "a")?.label).toContain(
      "縮小軌道半徑",
    );
    expect(zhStrongerFieldQuestion?.explanation).toContain("r = mv/(|q|B)");
    expect(zhStrongerFieldQuestion?.explanation).toContain("較小半徑");
    expect(
      [
        zhStrongerFieldQuestion?.prompt,
        zhStrongerFieldQuestion?.choices.find((choice) => choice.id === "a")?.label,
        zhStrongerFieldQuestion?.explanation,
        zhStrongerFieldQuestion?.showMeAction?.observationHint,
        ...Object.values(zhStrongerFieldQuestion?.selectedWrongExplanations ?? {}),
      ].join(" "),
    ).not.toMatch(/方向旋轉|更快地沿路徑轉彎|轉彎的速度/);
  });

  it("keeps the temperature and internal energy answer key varied across locales", () => {
    const concept = getConceptBySlug("temperature-and-internal-energy");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "b",
      "c",
      "a",
      "b",
      "c",
    ]);
    expect(authoredQuestions[0]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "larger sample",
    );
    expect(authoredQuestions[0]?.selectedWrongExplanations?.a).toContain(
      "temperature with total internal energy",
    );

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "b",
      "c",
      "a",
      "b",
      "c",
    ]);
    expect(zhAuthoredQuestions[4]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "不總是",
    );
    expect(zhAuthoredQuestions[4]?.selectedWrongExplanations?.a).toContain("忽視");
  });

  it("keeps the ideal gas law and kinetic theory answer key varied across locales", () => {
    const concept = getConceptBySlug("ideal-gas-law-and-kinetic-theory");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "a",
    ]);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "move faster",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "higher pressure",
    );
    expect(authoredQuestions[3]?.selectedWrongExplanations?.a).toContain(
      "does not lock temperature",
    );

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhConcept.title).toContain("分子動理論");
    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "a",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "更快",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "壓力仍然更高",
    );
    expect(zhAuthoredQuestions[3]?.selectedWrongExplanations?.a).toContain("不會鎖定溫度");
  });

  it("keeps the specific heat and phase change answer key varied across locales", () => {
    const concept = getConceptBySlug("specific-heat-and-phase-change");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "a",
    ]);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "changing phase fraction",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "doubling mass doubles",
    );
    expect(authoredQuestions[3]?.selectedWrongExplanations?.a).toContain(
      "phase-change shelf",
    );

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "a",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "改變相態比例",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "m c 加倍",
    );
    expect(zhAuthoredQuestions[3]?.selectedWrongExplanations?.a).toContain("平台");
  });

  it("keeps the conservation-of-momentum quiz varied and localized", () => {
    const concept = getConceptBySlug("conservation-of-momentum");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "a",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "a",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "車B的速度變化變得更小",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "總動量線保持平坦",
    );

    const zhSession = buildConceptQuizSession(zhConcept, {
      seed: "content-quiz:conservation-of-momentum-quality",
      locale: "zh-HK",
    });
    const generatedQuestion = zhSession.questions.find(
      (question) => question.kind === "generated",
    );

    expect(generatedQuestion?.prompt).toContain("生成設定");
    expect(generatedQuestion?.givens?.map((given) => given.label).join(" ")).toMatch(
      /時間|車 A|車 B|內力|互動時間/,
    );
    expect(generatedQuestion?.givens?.map((given) => given.label).join(" ")).not.toContain(
      "Momentum of cart",
    );
    expect(generatedQuestion?.explanation).toMatch(/兩部車|車 A|車 B|總動量/);
    expect(generatedQuestion?.explanation).not.toContain("The carts are exchanging");
    expect(generatedQuestion?.explanation).not.toContain("Use $p_{\\mathrm{tot}}");
  });

  it("keeps the collisions quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("collisions");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "非彈性碰撞",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "車B的速度變化較小",
    );
    expect(zhAuthoredQuestions[3]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "系統的總動量",
    );
    expect(zhAuthoredQuestions[1]?.selectedWrongExplanations?.a).toContain("彈性碰撞");
    expect(zhAuthoredQuestions[2]?.selectedWrongExplanations?.a).toContain("總動量是否消失");
    expect(zhAuthoredQuestions[3]?.selectedWrongExplanations?.a).toContain("相對速度");
  });

  it("keeps the projectile-motion quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("projectile-motion");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "vertical velocity is zero",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "gives up horizontal speed",
    );
    expect(authoredQuestions[3]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "horizontal motion keeps the same straight-line trend",
    );

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "垂直速度",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "放棄了水平速度",
    );
    expect(zhAuthoredQuestions[3]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "水平運動保持相同的直線趨勢",
    );
    expect(zhAuthoredQuestions[1]?.selectedWrongExplanations?.a).toContain("頂點");
    expect(zhAuthoredQuestions[2]?.selectedWrongExplanations?.a).toContain("高度和射程");
    expect(zhAuthoredQuestions[3]?.selectedWrongExplanations?.a).toContain("水平分量");
  });

  it("keeps the gravitational-fields quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("gravitational-fields");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "one quarter",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "unchanged by the probe mass",
    );
    expect(authoredQuestions[3]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "field magnitude and the force magnitude double",
    );

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "四分之一",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "不受探測質量影響",
    );
    expect(zhAuthoredQuestions[3]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "方向保持相同",
    );
    expect(zhAuthoredQuestions[2]?.selectedWrongExplanations?.a).toContain("源質量和距離");
    expect(zhAuthoredQuestions[2]?.showMeAction?.label).toBe("顯示較重的探測器");
  });

  it("keeps the circular-orbits quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("circular-orbits-orbital-speed");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "b",
      "c",
      "a",
      "b",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[0]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "Gravity is stronger than the turning requirement",
    );
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "actual speed rises with the circular target",
    );
    expect(authoredQuestions[3]?.selectedWrongExplanations?.a).toContain("gravity to vanish");

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "b",
      "c",
      "a",
      "b",
    ]);
    expect(zhAuthoredQuestions[0]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "引力比轉彎需求大",
    );
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "圓週週期縮短",
    );
    expect(zhAuthoredQuestions[3]?.selectedWrongExplanations?.a).toContain("引力消失");
  });

  it("keeps the Kepler period quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("keplers-third-law-orbital-periods");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "c",
      "b",
      "c",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "allowed circular speed rises",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "farther to travel",
    );
    expect(authoredQuestions[3]?.selectedWrongExplanations?.a).toContain("circular balance");

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "c",
      "b",
      "c",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "速度上升",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "繞行距離更遠",
    );
    expect(zhAuthoredQuestions[3]?.selectedWrongExplanations?.a).toContain("不同的週期");
  });

  it("keeps the escape velocity quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("escape-velocity");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "threshold speed rises",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "lower threshold speed",
    );
    expect(authoredQuestions[3]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "Gravity keeps acting",
    );
    expect(authoredQuestions[2]?.selectedWrongExplanations?.a).toContain("Source mass matters");

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "門檻速度",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "重力勢阱",
    );
    expect(zhAuthoredQuestions[3]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "重力仍然存在",
    );
    for (const question of zhAuthoredQuestions) {
      expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
        question.correctChoiceId,
      );
    }
  });

  it("keeps the wave-and-quantum quiz answer keys varied and localized", () => {
    const cases = [
      {
        slug: "atomic-spectra",
        enQ1: "shorter wavelength",
        enQ2: "same allowed wavelengths",
        zhQ1: "更短的波長",
        zhQ2: "相同的允許波長",
      },
      {
        slug: "bohr-model",
        enQ1: "crowds toward the Balmer limit",
        enQ2: "same wavelength",
        zhQ1: "巴耳末極限",
        zhQ2: "同一個波長",
      },
      {
        slug: "diffraction",
        enQ1: "main diffraction peak gets broader",
        enQ2: "broader central peak",
        zhQ1: "主要的衍射峯變寬",
        zhQ2: "中央主峰應更寬",
      },
      {
        slug: "double-slit-interference",
        enQ1: "fringes tighten",
        enQ2: "Case B, because both longer wavelength",
        zhQ1: "條紋收緊",
        zhQ2: "情況 B",
      },
      {
        slug: "electromagnetic-waves",
        enQ1: "magnetic amplitude grows",
        enQ2: "matches the source phase",
        zhQ1: "磁振幅增大",
        zhQ2: "與來源相位相同",
      },
    ] as const;

    for (const fixture of cases) {
      const concept = getConceptBySlug(fixture.slug);
      const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
        "a",
        "b",
        "c",
        "a",
      ]);
      expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
      expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.enQ1,
      );
      expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
        fixture.enQ2,
      );
      expect(authoredQuestions[1]?.selectedWrongExplanations?.a).toBeTruthy();
      expect(authoredQuestions[2]?.selectedWrongExplanations?.a).toBeTruthy();

      const zhConcept = localizeConceptContent(concept, "zh-HK");
      const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

      expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
        "a",
        "b",
        "c",
        "a",
      ]);
      expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.zhQ1,
      );
      expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
        fixture.zhQ2,
      );
      expect(zhAuthoredQuestions[1]?.selectedWrongExplanations?.a).toBeTruthy();
      expect(zhAuthoredQuestions[2]?.selectedWrongExplanations?.a).toBeTruthy();
    }
  });

  it("keeps the algorithms and graph-search quiz answer keys varied", () => {
    const fiveQuestionCases = [
      {
        slug: "sorting-and-algorithmic-trade-offs",
        q1: "starting order",
        q2: "fewer writes",
      },
      {
        slug: "graph-representation-and-adjacency-intuition",
        q1: "neighbors of the chosen start node",
        q2: "connected to it by one edge",
      },
      {
        slug: "breadth-first-search-and-layered-frontiers",
        q1: "fewest-edge distance",
        q2: "queue order",
      },
      {
        slug: "depth-first-search-and-backtracking-paths",
        q1: "does not guarantee the shallowest route",
        q2: "stack",
      },
      {
        slug: "frontier-and-visited-state-on-graphs",
        q1: "reopening the same looped nodes",
        q2: "discovered but not fully expanded",
      },
    ] as const;

    for (const fixture of fiveQuestionCases) {
      const authoredQuestions = resolveConceptQuizDefinition(getConceptBySlug(fixture.slug)).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
        "a",
        "b",
        "c",
        "b",
        "c",
      ]);
      expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
      expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.q1,
      );
      expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
        fixture.q2,
      );
      for (const question of authoredQuestions) {
        expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
          question.correctChoiceId,
        );
        expect(Object.keys(question.selectedWrongExplanations ?? {}).length).toBeGreaterThanOrEqual(2);
      }
    }

    const binarySearch = resolveConceptQuizDefinition(
      getConceptBySlug("binary-search-halving-the-search-space"),
    ).staticQuestions;

    expect(binarySearch.map((question) => question.correctChoiceId)).toEqual(["a", "b"]);
    expect(binarySearch[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "active interval keeps shrinking",
    );
    for (const question of binarySearch) {
      expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
        question.correctChoiceId,
      );
      expect(Object.keys(question.selectedWrongExplanations ?? {}).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the chemistry quiz answer keys varied", () => {
    const threeQuestionCases = [
      {
        slug: "reaction-rate-collision-theory",
        q1: "successful share should usually rise",
        q2: "effective barrier",
      },
      {
        slug: "dynamic-equilibrium-le-chateliers-principle",
        q1: "move toward more products",
        q2: "rate curves are nearly on top",
      },
    ] as const;

    const twoQuestionCases = [
      {
        slug: "concentration-and-dilution",
        q1: "Adding more solute",
      },
      {
        slug: "solubility-and-saturation",
        q1: "Solubility limit",
      },
      {
        slug: "acid-base-ph-intuition",
        q1: "move the pH back toward neutral",
      },
      {
        slug: "buffers-and-neutralization",
        q1: "opposite side",
      },
      {
        slug: "stoichiometric-ratios-and-recipe-batches",
        q1: "number of full batches can change",
      },
      {
        slug: "limiting-reagent-and-leftover-reactants",
        q1: "excess side",
      },
      {
        slug: "percent-yield-and-reaction-extent",
        q1: "actual output relative",
      },
    ] as const;

    for (const fixture of threeQuestionCases) {
      const authoredQuestions = resolveConceptQuizDefinition(getConceptBySlug(fixture.slug)).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual(["a", "b", "c"]);
      expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
      expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.q1,
      );
      expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
        fixture.q2,
      );
    }

    for (const fixture of twoQuestionCases) {
      const authoredQuestions = resolveConceptQuizDefinition(getConceptBySlug(fixture.slug)).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual(["a", "b"]);
      expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.q1,
      );
      for (const question of authoredQuestions) {
        expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
          question.correctChoiceId,
        );
      }
    }
  });

  it("keeps the geometry and parametric quiz answer keys varied", () => {
    const matrix = resolveConceptQuizDefinition(getConceptBySlug("matrix-transformations")).staticQuestions;

    expect(matrix.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "c",
    ]);
    expect(new Set(matrix.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(matrix[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "second-column x entry",
    );
    expect(matrix[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "whole plane action",
    );

    const twoQuestionCases = [
      {
        slug: "complex-numbers-on-the-plane",
        q1: "rotate a lot",
      },
      {
        slug: "unit-circle-sine-cosine-from-rotation",
        q1: "cosine and sine are negative",
      },
      {
        slug: "polar-coordinates-radius-and-angle",
        q1: "same direction and quadrant",
      },
      {
        slug: "trig-identities-from-unit-circle-geometry",
        q1: "raw cosine sign flips",
      },
      {
        slug: "inverse-trig-angle-from-ratio",
        q1: "same ray",
      },
      {
        slug: "parametric-curves-motion-from-equations",
        q1: "farther left and right",
      },
    ] as const;

    for (const fixture of twoQuestionCases) {
      const authoredQuestions = resolveConceptQuizDefinition(getConceptBySlug(fixture.slug)).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual(["a", "b"]);
      expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.q1,
      );
      for (const question of authoredQuestions) {
        expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
          question.correctChoiceId,
        );
        expect(Object.keys(question.selectedWrongExplanations ?? {}).length).toBeGreaterThanOrEqual(2);
      }
    }

    for (const question of matrix) {
      expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
        question.correctChoiceId,
      );
      expect(Object.keys(question.selectedWrongExplanations ?? {}).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the calculus and vector quiz answer keys varied", () => {
    const cases = [
      {
        slug: "derivative-as-slope-local-rate-of-change",
        q1: "averages over an interval",
        q2: "falling from left to right",
      },
      {
        slug: "limits-and-continuity-approaching-a-value",
        q1: "finite limit and the actual function value match",
        q2: "no finite two-sided limit",
      },
      {
        slug: "optimization-maxima-minima-and-constraints",
        q1: "Increase the width",
        q2: "height to collapse",
      },
      {
        slug: "integral-as-accumulation-area",
        q1: "local, while the accumulated amount is a running total",
        q2: "new signed area is negative",
      },
      {
        slug: "vectors-in-2d",
        q1: "opposite vector",
        q2: "flips direction",
      },
      {
        slug: "dot-product-angle-and-projection",
        q1: "no along-A component",
        q2: "points against A",
      },
    ] as const;

    for (const fixture of cases) {
      const concept = getConceptBySlug(fixture.slug);
      const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual(["a", "b", "c"]);
      expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
      expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.q1,
      );
      expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
        fixture.q2,
      );
      for (const question of authoredQuestions) {
        expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
          question.correctChoiceId,
        );
      }
    }
  });

  it("keeps the electrostatics quiz answer keys varied", () => {
    const electricFields = resolveConceptQuizDefinition(getConceptBySlug("electric-fields")).staticQuestions;

    expect(electricFields.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
    ]);
    expect(new Set(electricFields.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(electricFields[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "net field is zero",
    );
    expect(electricFields[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "points mostly to the right",
    );

    const capacitance = resolveConceptQuizDefinition(
      getConceptBySlug("capacitance-and-stored-electric-energy"),
    ).staticQuestions;

    expect(capacitance.map((question) => question.correctChoiceId)).toEqual(["a", "b", "c"]);
    expect(new Set(capacitance.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(capacitance[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "Stored charge doubles",
    );
    expect(capacitance[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "same battery can store different charge",
    );

    for (const question of [...electricFields, ...capacitance]) {
      expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
        question.correctChoiceId,
      );
    }
  });

  it("keeps the magnetism and field-synthesis quiz answer keys varied", () => {
    const cases = [
      {
        slug: "magnetic-fields",
        q1: "net field is zero",
        q2: "points straight up",
      },
      {
        slug: "electromagnetic-induction",
        q1: "flux curve has zero slope",
        q2: "reverse the direction",
      },
      {
        slug: "maxwells-equations-synthesis",
        q1: "net magnetic flux",
        q2: "electric field is changing",
      },
    ] as const;

    for (const fixture of cases) {
      const concept = getConceptBySlug(fixture.slug);
      const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
        "a",
        "b",
        "c",
        "b",
      ]);
      expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
      expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.q1,
      );
      expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
        fixture.q2,
      );
      for (const question of authoredQuestions) {
        expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
          question.correctChoiceId,
        );
        expect(Object.keys(question.selectedWrongExplanations ?? {}).length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("keeps the circuit quiz answer keys varied across the accelerated batch", () => {
    const fiveQuestionCases = [
      {
        slug: "basic-circuits",
        q1: "lower-resistance branch draws more current",
        q2: "larger resistance takes the larger drop",
      },
      {
        slug: "series-parallel-circuits",
        q1: "larger drop",
        q2: "lower-resistance branch draws more current",
      },
      {
        slug: "equivalent-resistance",
        q1: "parallel-group case has the smaller grouped equivalent",
        q2: "smaller branch resistance takes the larger current",
      },
      {
        slug: "power-energy-circuits",
        q1: "I = V/R",
        q2: "power grows faster than linearly",
      },
      {
        slug: "electric-potential",
        q1: "field is zero there, but the potential is positive",
        q2: "potential is zero there, but the field is not zero",
      },
    ] as const;

    const fourQuestionCases = [
      {
        slug: "internal-resistance-and-terminal-voltage",
        q1: "internal drop larger",
        q2: "smaller internal resistance",
      },
      {
        slug: "kirchhoff-loop-and-junction-rules",
        q1: "+V - V_1 - V_3 = 0",
        q2: "junction split disappears",
      },
      {
        slug: "rc-charging-and-discharging",
        q1: "partway to its final voltage",
        q2: "tau increases",
      },
    ] as const;

    for (const fixture of fiveQuestionCases) {
      const concept = getConceptBySlug(fixture.slug);
      const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
        "a",
        "b",
        "c",
        "b",
        "c",
      ]);
      expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
      expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.q1,
      );
      expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
        fixture.q2,
      );
      for (const question of authoredQuestions) {
        expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
          question.correctChoiceId,
        );
      }

      const zhConcept = localizeConceptContent(concept, "zh-HK");
      const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

      expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
        "a",
        "b",
        "c",
        "b",
        "c",
      ]);
      for (const question of zhAuthoredQuestions) {
        expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
          question.correctChoiceId,
        );
      }
    }

    for (const fixture of fourQuestionCases) {
      const concept = getConceptBySlug(fixture.slug);
      const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
        "a",
        "b",
        "c",
        "b",
      ]);
      expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
      expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
        fixture.q1,
      );
      expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
        fixture.q2,
      );
      for (const question of authoredQuestions) {
        expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
          question.correctChoiceId,
        );
      }
    }
  });

  it("keeps the gravitational-potential-energy quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("gravitational-potential-energy");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "a",
      "b",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "below the zero-at-infinity reference",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "potential energy doubles",
    );
    expect(authoredQuestions[4]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "twice the magnitude of phi",
    );

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "a",
      "b",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "低於無窮遠零點",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "勢能大小會加倍",
    );
    expect(zhAuthoredQuestions[4]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "大小和重力場大小都會是兩倍",
    );
    expect(zhAuthoredQuestions[1]?.selectedWrongExplanations?.a).toContain("排斥");
    expect(zhAuthoredQuestions[2]?.selectedWrongExplanations?.a).toContain("反轉");
    expect(zhAuthoredQuestions[4]?.selectedWrongExplanations?.a).toContain("來源質量");
  });

  it("keeps the torque quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("torque");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "a",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "line of action can pass through the pivot",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "perpendicular component stays matched",
    );

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "a",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "透過軸心",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "垂直到量保持匹配",
    );
    expect(zhAuthoredQuestions[1]?.selectedWrongExplanations?.a).toContain("方向");
    expect(zhAuthoredQuestions[2]?.selectedWrongExplanations?.a).toContain("角度很重要");
  });

  it("keeps static equilibrium centre-of-mass generated choices focused on mass distribution", () => {
    const concept = getConceptBySlug("static-equilibrium-centre-of-mass");
    const session = buildConceptQuizSession(concept, {
      seed: "secm-review",
      locale: "en",
    });
    const generatedQuestion = session.questions.find(
      (question) =>
        question.kind === "generated" &&
        question.templateId === "worked-example:current-centre-of-mass",
    );

    expect(generatedQuestion?.prompt).toContain("x_c = 1.2 m");
    expect(generatedQuestion?.choices.map((choice) => choice.label).join(" ")).toContain("0.4");
    expect(new Set(generatedQuestion?.choices.map((choice) => choice.label) ?? []).size).toBe(4);
  });

  it("keeps rotational inertia generated prompts computable from the shown givens", () => {
    const concept = getConceptBySlug("rotational-inertia");
    const session = buildConceptQuizSession(concept, {
      seed: "rotational-inertia-review",
      locale: "en",
    });
    const inertiaQuestion = session.questions.find(
      (question) =>
        question.kind === "generated" &&
        question.templateId === "worked-example:current-inertia-response",
    );
    const spinUpQuestion = session.questions.find(
      (question) =>
        question.kind === "generated" &&
        question.templateId === "worked-example:current-spin-up-state",
    );

    expect(inertiaQuestion?.givens?.map((given) => given.label)).toEqual([
      "Mass radius",
      "Applied torque",
      "Moving mass",
    ]);
    expect(inertiaQuestion?.prompt).toContain("M =");
    expect(spinUpQuestion?.givens?.map((given) => given.label)).toEqual([
      "Time",
      "Moment of inertia",
      "Angular acceleration",
    ]);
    expect(spinUpQuestion?.prompt).toContain("I =");
    expect(spinUpQuestion?.prompt).toContain("α =");
  });

  it("keeps the zh-HK rolling-motion bridge question aligned with the canonical answer key", () => {
    const concept = localizeConceptContent(getConceptBySlug("rolling-motion"), "zh-HK");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;
    const bridgeQuestion = authoredQuestions.find(
      (question) => question.canonicalQuestionId === "rolling-motion-qt-bridge",
    );
    const frictionQuestion = authoredQuestions.find(
      (question) => question.canonicalQuestionId === "rolling-motion-qt-friction",
    );

    expect(bridgeQuestion?.prompt).toContain("為什麼滾動運動");
    expect(bridgeQuestion?.correctChoiceId).toBe("a");
    expect(bridgeQuestion?.choices.find((choice) => choice.id === "a")?.label).toContain(
      "旋轉慣性直接改變可見的平移競賽",
    );
    expect(bridgeQuestion?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "忽略旋轉慣性",
    );
    expect(bridgeQuestion?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "相同的角動量",
    );
    expect(frictionQuestion?.selectedWrongExplanations?.c).toContain("扭矩來源");
    expect(frictionQuestion?.showMeAction?.label).toBe("顯示摩擦扭矩提示");
  });

  it("keeps the Math functions concept quiz answer keys varied and localized", () => {
    const fixtures = [
      {
        slug: "graph-transformations",
        keys: ["a", "b", "c"],
        zhChecks: [
          { index: 1, choiceId: "b", text: "沿 x 軸翻轉" },
          { index: 2, choiceId: "c", text: "左右方向" },
        ],
      },
      {
        slug: "rational-functions-asymptotes-and-behavior",
        keys: ["a", "b", "c", "b", "c"],
        zhChecks: [
          { index: 3, choiceId: "b", text: "分支位置" },
          { index: 4, choiceId: "c", text: "有限高度" },
        ],
      },
      {
        slug: "exponential-change-growth-decay-logarithms",
        keys: ["a", "b", "c", "b", "c"],
        zhChecks: [
          { index: 1, choiceId: "b", text: "目標永遠無法達到" },
          { index: 2, choiceId: "c", text: "時間在指數" },
          { index: 4, choiceId: "c", text: "比值" },
        ],
      },
    ] as const;

    for (const fixture of fixtures) {
      const concept = getConceptBySlug(fixture.slug);
      const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

      expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual(
        fixture.keys,
      );
      expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
      expect(
        authoredQuestions.every(
          (question) => question.choices.map((choice) => choice.id).join("") === "abc",
        ),
      ).toBe(true);
      for (const question of authoredQuestions) {
        expect(Object.keys(question.selectedWrongExplanations ?? {})).not.toContain(
          question.correctChoiceId,
        );
      }

      const zhConcept = localizeConceptContent(concept, "zh-HK");
      const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

      expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual(
        fixture.keys,
      );
      expect(
        zhAuthoredQuestions.every(
          (question) => question.choices.map((choice) => choice.id).join("") === "abc",
        ),
      ).toBe(true);
      for (const check of fixture.zhChecks) {
        expect(
          zhAuthoredQuestions[check.index]?.choices.find((choice) => choice.id === check.choiceId)
            ?.label,
        ).toContain(check.text);
      }

      if (fixture.slug === "exponential-change-growth-decay-logarithms") {
        const zhQuizCopy = zhAuthoredQuestions
          .flatMap((question) => [
            question.prompt,
            question.explanation,
            ...question.choices.map((choice) => choice.label),
          ])
          .join("\n");

        expect(zhQuizCopy).not.toContain("半-Life");
        expect(zhQuizCopy).not.toContain("擊中時間");
        expect(zhAuthoredQuestions[1]?.prompt).toContain("一條衰減曲線");
        expect(zhAuthoredQuestions[1]?.prompt).not.toContain("k 為正時");
      }
    }
  });

  it("keeps the pressure and hydrostatic pressure quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("pressure-and-hydrostatic-pressure");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "c",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "same hydrostatic pressure",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "rho g h",
    );
    expect(authoredQuestions[3]?.selectedWrongExplanations?.a).toContain("upward-only");
    expect(authoredQuestions[4]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "Pressure vs density",
    );

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "c",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "相同的靜水壓力",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "每米深度增加更多的壓力",
    );
    expect(zhAuthoredQuestions[3]?.selectedWrongExplanations?.a).toContain("僅指向上方");
    expect(zhAuthoredQuestions[4]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "壓力對密度",
    );
  });

  it("keeps the continuity-equation quiz answer key varied and localized", () => {
    const concept = getConceptBySlug("continuity-equation");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "same flow rate",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "changing area changes speed",
    );

    const optimizedEnglishConcept = localizeConceptContent(concept, "en");
    expect(
      resolveConceptQuizDefinition(optimizedEnglishConcept).staticQuestions.map(
        (question) => question.correctChoiceId,
      ),
    ).toEqual(["a", "b", "c"]);

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(zhAuthoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "相同的流率",
    );
    expect(zhAuthoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "截面積改變",
    );

    const session = buildConceptQuizSession(concept, {
      seed: "content-quiz:continuity-equation-quality",
      locale: "en",
    });

    expect(session.questions).toHaveLength(5);
    expect(session.questions.filter((question) => question.kind === "generated")).toHaveLength(2);
  });

  it("keeps the bernoulli-principle quiz answer key varied with specific wrong-answer feedback", () => {
    const concept = getConceptBySlug("bernoullis-principle");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "height term",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "Continuity sets the speed change",
    );
    expect(authoredQuestions[0]?.selectedWrongExplanations?.b).toContain("same flow rate");
    expect(authoredQuestions[1]?.selectedWrongExplanations?.c).toContain("turning continuity off");
    expect(authoredQuestions[2]?.selectedWrongExplanations?.a).toContain("does not replace");
    expect(authoredQuestions[0]?.explanation).toContain("same budget");
    expect(authoredQuestions[1]?.explanation).toContain("height term");
    expect(authoredQuestions[1]?.explanation).not.toContain("ho g y");

    const session = buildConceptQuizSession(concept, {
      seed: "content-quiz:bernoullis-principle-quality",
      locale: "en",
    });

    expect(session.questions).toHaveLength(5);
    expect(session.questions.filter((question) => question.kind === "generated")).toHaveLength(2);
    const renderedQuizText = session.questions.flatMap((question) => [
      question.formattedCorrectAnswer,
      question.explanation,
      ...question.choices.map((choice) => choice.label),
    ]);

    expect(renderedQuizText).not.toEqual(expect.arrayContaining([expect.stringContaining("text{level}")]));
    expect(renderedQuizText.join("\n")).not.toMatch(/about \d+(?:\.\d+)?\\,\\mathrm\{kPa\}\$ of static/);
    expect(renderedQuizText.join("\n")).not.toMatch(/by \d+(?:\.\d+)?\\,\\mathrm\{m\}\$ costs/);
    expect(renderedQuizText.join("\n")).not.toMatch(/drop of \d+(?:\.\d+)?\\,\\mathrm\{kPa\}\$/);
    expect(renderedQuizText.join("\n")).not.toMatch(/remains \d+(?:\.\d+)?\\,\\mathrm\{m\/s\}\$/);
    expect(renderedQuizText.join("\n")).not.toMatch(/from \d+(?:\.\d+)?\\,\\mathrm\{kPa\}\$ to about/);
  });

  it("keeps the buoyancy and Archimedes quiz answer keys readable, varied, and localized", () => {
    const concept = getConceptBySlug("buoyancy-and-archimedes-principle");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(4);
    expect(authoredQuestions.every((question) => question.choices.map((choice) => choice.id).join("") === "abcd")).toBe(
      true,
    );
    expect(authoredQuestions[0]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "0.6",
    );
    expect(authoredQuestions[1]?.selectedWrongExplanations?.a).toContain("absolute pressure");
    expect(authoredQuestions[2]?.selectedWrongExplanations?.c).toContain("pressure difference");
    expect(authoredQuestions[3]?.selectedWrongExplanations?.a).toContain("displaces the same fluid weight");

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(zhAuthoredQuestions.every((question) => question.choices.map((choice) => choice.id).join("") === "abcd")).toBe(
      true,
    );
    expect(zhAuthoredQuestions[0]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "0.6",
    );
    expect(zhAuthoredQuestions[1]?.selectedWrongExplanations?.a).toContain("絕對壓力");
    expect(zhAuthoredQuestions[2]?.selectedWrongExplanations?.c).toContain("壓力差");
    expect(zhAuthoredQuestions[3]?.selectedWrongExplanations?.a).toContain("相同重量的流體");
  });

  it("keeps the drag and terminal velocity answer key varied and localized", () => {
    const concept = getConceptBySlug("drag-and-terminal-velocity");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;

    expect(authoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "a",
    ]);
    expect(new Set(authoredQuestions.map((question) => question.correctChoiceId)).size).toBe(3);
    expect(authoredQuestions[1]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "constant weight is larger",
    );
    expect(authoredQuestions[2]?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "acceleration is near zero",
    );
    expect(authoredQuestions[3]?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "$v^2$ drag term is tiny",
    );

    const zhConcept = localizeConceptContent(concept, "zh-HK");
    const zhAuthoredQuestions = resolveConceptQuizDefinition(zhConcept).staticQuestions;
    const areaQuestion = zhAuthoredQuestions.find(
      (question) => question.canonicalQuestionId === "dtv-qt-area",
    );
    const ratioQuestion = zhAuthoredQuestions.find(
      (question) => question.canonicalQuestionId === "dtv-qt-ratio",
    );

    expect(zhAuthoredQuestions.map((question) => question.correctChoiceId)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "a",
    ]);
    expect(areaQuestion?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "更多空間加速",
    );
    expect(areaQuestion?.choices.find((choice) => choice.id === "b")?.label).not.toContain(
      "空間加速度",
    );
    expect(ratioQuestion?.correctChoiceId).toBe("a");
    expect(ratioQuestion?.choices.find((choice) => choice.id === "a")?.label).toContain(
      "終速可以保持相同",
    );
    expect(ratioQuestion?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "一定會有低很多的終速",
    );
    expect(ratioQuestion?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "只有質量會影響終速",
    );
    expect(ratioQuestion?.selectedWrongExplanations?.b).toContain("平衡比例沒有改變");
    expect(ratioQuestion?.selectedWrongExplanations?.c).toContain("面積仍然會");
  });

  it("keeps the zh-HK angular-momentum generated question localized and computable", () => {
    const concept = localizeConceptContent(getConceptBySlug("angular-momentum"), "zh-HK");
    const session = buildConceptQuizSession(concept, {
      seed: "content-quiz:angular-momentum-quality",
      locale: "zh-HK",
    });
    const generatedQuestion = session.questions.find(
      (question) =>
        question.kind === "generated" &&
        question.templateId === "worked-example:current-angular-momentum",
    );

    expect(generatedQuestion?.prompt).toContain("目前這個轉子有多大的轉動慣量與角動量");
    expect(generatedQuestion?.prompt).toContain("生成設定");
    expect(generatedQuestion?.givens?.map((given) => given.label)).toEqual([
      "質量半徑",
      "角速度",
      "移動質量",
    ]);
    expect(generatedQuestion?.explanation).toContain("這個有限轉子使用");
    expect(generatedQuestion?.explanation).toContain("移動質量為");
    expect(generatedQuestion?.explanation).toContain("轉動慣量會隨質量半徑改變");
    expect(generatedQuestion?.prompt).not.toContain("Moving mass");
    expect(generatedQuestion?.explanation).not.toContain("For this bounded rotor");
    expect(generatedQuestion?.explanation).not.toContain("This wide layout");
  });

  it("keeps the zh-HK momentum-and-impulse quiz aligned with the answer key", () => {
    const concept = localizeConceptContent(getConceptBySlug("momentum-impulse"), "zh-HK");
    const authoredQuestions = resolveConceptQuizDefinition(concept).staticQuestions;
    const impulseComparisonQuestion = authoredQuestions.find(
      (question) => question.canonicalQuestionId === "mi-qt-1",
    );
    const graphQuestion = authoredQuestions.find(
      (question) => question.canonicalQuestionId === "mi-qt-3",
    );

    expect(impulseComparisonQuestion?.correctChoiceId).toBe("a");
    expect(
      impulseComparisonQuestion?.choices.find((choice) => choice.id === "b")?.label,
    ).toContain("一定造成較大的動量改變");
    expect(
      impulseComparisonQuestion?.choices.find((choice) => choice.id === "c")?.label,
    ).toContain("一定造成零動量改變");
    expect(impulseComparisonQuestion?.explanation).toContain("力-時間圖下的帶符號面積");
    expect(graphQuestion?.correctChoiceId).toBe("a");
    expect(graphQuestion?.choices.find((choice) => choice.id === "a")?.label).toContain(
      "不再有額外衝量加入",
    );
    expect(graphQuestion?.choices.find((choice) => choice.id === "b")?.label).toContain(
      "永遠保持斜率",
    );
    expect(graphQuestion?.choices.find((choice) => choice.id === "c")?.label).toContain(
      "立即歸零",
    );
    expect(graphQuestion?.explanation).toContain("小車仍可以繼續運動");
    expect(graphQuestion?.selectedWrongExplanations?.c).toContain("不是自動歸零");

    const session = buildConceptQuizSession(concept, {
      seed: "content-quiz:momentum-impulse-quality",
      locale: "zh-HK",
    });
    const generatedQuestion = session.questions.find(
      (question) =>
        question.kind === "generated" &&
        question.templateId === "worked-example:current-momentum",
    );

    expect(generatedQuestion?.prompt).toContain("小車的動量是多少");
    expect(generatedQuestion?.prompt).toContain("選出相符的結果");
    expect(generatedQuestion?.givens?.map((given) => given.label)).toEqual([
      "時間",
      "質量",
      "速度",
    ]);
    expect(generatedQuestion?.explanation).toContain("在目前檢查的時刻");
    expect(generatedQuestion?.explanation).toContain("\\times");
    expect(generatedQuestion?.explanation).toContain("\\mathrm{kg\\,m/s}");
    expect(generatedQuestion?.explanation).not.toContain("Use $p = mv");
    expect(generatedQuestion?.explanation).not.toMatch(/\t/);

    const pulseExample = concept.sections.workedExamples.items.find(
      (example) => example.id === "pulse-impulse",
    );

    expect(pulseExample).toBeTruthy();

    const resolvedPulse = resolveLiveWorkedExample(
      concept.slug,
      pulseExample!,
      {
        slug: concept.slug,
        params: {
          mass: 1,
          initialVelocity: 0.5,
          force: 1.5,
          pulseDuration: 0.8,
        },
        time: 1,
        timeSource: "inspect",
        activeGraphId: "impulse",
        interactionMode: "explore",
        activeCompareTarget: null,
        activePresetId: "long-gentle-push",
      },
      "zh-HK",
    );

    const pulseStepCopy = resolvedPulse.steps.map((step) => step.content).join("\n");

    expect(pulseStepCopy).toContain("恆定力脈衝");
    expect(pulseStepCopy).toContain("\\Delta t");
    expect(pulseStepCopy).toContain("\\times");
    expect(pulseStepCopy).toContain("\\mathrm{N\\,s}");
    expect(resolvedPulse.interpretation).toContain("較溫和但作用較久");
    expect(pulseStepCopy).not.toContain("Use $J = F");
    expect(pulseStepCopy).not.toMatch(/\t/);
    expect(resolvedPulse.interpretation).not.toContain("This is a gentler");
  });
});
