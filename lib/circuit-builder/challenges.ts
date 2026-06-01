import { formatMeasurement } from "@/lib/physics/math";
import { createDefaultCircuitEnvironment } from "./model";
import { circuitBuilderPresets } from "./presets";
import type {
  CircuitComponentInstance,
  CircuitDocument,
  CircuitSolveResult,
} from "./types";

type CircuitChallengeLocale = "en" | "zh-HK";
type LocalizedText = Record<CircuitChallengeLocale, string>;

export type CircuitBuilderChallengeId =
  | "battery-resistor-loop"
  | "ammeter-in-series"
  | "branch-current-compare"
  | "fuse-trip-test"
  | "bulb-brightness";

export type CircuitBuilderChallenge = {
  id: CircuitBuilderChallengeId;
  title: LocalizedText;
  goal: LocalizedText;
  starterLabel: LocalizedText;
};

export type CircuitBuilderChallengeCheck = {
  status: "success" | "incomplete" | "wrong-placement";
  title: string;
  hint: string;
  explanation: string;
  measurements: { label: string; value: string }[];
};

export const circuitBuilderChallenges: CircuitBuilderChallenge[] = [
  {
    id: "battery-resistor-loop",
    title: {
      en: "Complete a battery-resistor loop",
      "zh-HK": "完成電池-電阻迴路",
    },
    goal: {
      en: "Build one closed path: battery -> resistor -> back to battery.",
      "zh-HK": "建立一條閉合路徑：電池 -> 電阻 -> 回到電池。",
    },
    starterLabel: {
      en: "Load two-part starter",
      "zh-HK": "載入兩元件起步",
    },
  },
  {
    id: "ammeter-in-series",
    title: {
      en: "Add an ammeter correctly",
      "zh-HK": "正確加入電流錶",
    },
    goal: {
      en: "Put the ammeter in series so current must pass through it.",
      "zh-HK": "把電流錶串聯，令電流必須流經它。",
    },
    starterLabel: {
      en: "Load loop plus loose ammeter",
      "zh-HK": "載入迴路和未接電流錶",
    },
  },
  {
    id: "branch-current-compare",
    title: {
      en: "Compare series vs branch current",
      "zh-HK": "比較串聯和分支電流",
    },
    goal: {
      en: "Use the branch preset to see source current split between paths.",
      "zh-HK": "用分支預設觀察電源電流如何分流。",
    },
    starterLabel: {
      en: "Load branch preset",
      "zh-HK": "載入分支預設",
    },
  },
  {
    id: "fuse-trip-test",
    title: {
      en: "Test a fuse",
      "zh-HK": "測試保險絲",
    },
    goal: {
      en: "Drive too much current through a fuse and explain why it opens.",
      "zh-HK": "讓過大電流流經保險絲，並解釋它為何斷開。",
    },
    starterLabel: {
      en: "Load fuse test",
      "zh-HK": "載入保險絲測試",
    },
  },
  {
    id: "bulb-brightness",
    title: {
      en: "Explain bulb brightness",
      "zh-HK": "解釋燈泡亮度",
    },
    goal: {
      en: "Power a bulb, then use power compared with rating to explain brightness.",
      "zh-HK": "點亮燈泡，並用功率與額定值比較來解釋亮度。",
    },
    starterLabel: {
      en: "Load bulb loop",
      "zh-HK": "載入燈泡迴路",
    },
  },
];

function t(locale: CircuitChallengeLocale, en: string, zhHk: string) {
  return locale === "zh-HK" ? zhHk : en;
}

function cloneDocument(document: CircuitDocument): CircuitDocument {
  return JSON.parse(JSON.stringify(document)) as CircuitDocument;
}

function baseDocument(
  components: CircuitComponentInstance[],
  wires: CircuitDocument["wires"],
): CircuitDocument {
  return {
    version: 1,
    environment: createDefaultCircuitEnvironment(),
    view: { zoom: 0.78, offsetX: 76, offsetY: 92 },
    components,
    wires,
  };
}

export function getCircuitBuilderChallenge(
  id: CircuitBuilderChallengeId,
): CircuitBuilderChallenge {
  return circuitBuilderChallenges.find((challenge) => challenge.id === id) ??
    circuitBuilderChallenges[0]!;
}

export function buildCircuitBuilderChallengeStarterDocument(
  id: CircuitBuilderChallengeId,
): CircuitDocument {
  if (id === "branch-current-compare") {
    return circuitBuilderPresets
      .find((preset) => preset.id === "metered-branch")!
      .buildDocument();
  }

  if (id === "bulb-brightness") {
    return circuitBuilderPresets
      .find((preset) => preset.id === "starter-series")!
      .buildDocument();
  }

  if (id === "battery-resistor-loop") {
    return baseDocument(
      [
        {
          id: "guide-battery",
          label: "Battery 1",
          type: "battery",
          x: 256,
          y: 320,
          rotation: 90,
          properties: { voltage: 9 },
        },
        {
          id: "guide-resistor",
          label: "Resistor 1",
          type: "resistor",
          x: 608,
          y: 224,
          rotation: 0,
          properties: { resistance: 12 },
        },
      ],
      [],
    );
  }

  if (id === "ammeter-in-series") {
    return baseDocument(
      [
        {
          id: "guide-battery",
          label: "Battery 1",
          type: "battery",
          x: 240,
          y: 320,
          rotation: 90,
          properties: { voltage: 9 },
        },
        {
          id: "guide-resistor",
          label: "Resistor 1",
          type: "resistor",
          x: 560,
          y: 224,
          rotation: 0,
          properties: { resistance: 12 },
        },
        {
          id: "guide-ammeter",
          label: "Ammeter 1",
          type: "ammeter",
          x: 864,
          y: 384,
          rotation: 0,
          properties: {},
        },
      ],
      [
        {
          id: "guide-wire-1",
          from: { componentId: "guide-battery", terminal: "a" },
          to: { componentId: "guide-resistor", terminal: "a" },
        },
        {
          id: "guide-wire-2",
          from: { componentId: "guide-resistor", terminal: "b" },
          to: { componentId: "guide-battery", terminal: "b" },
        },
      ],
    );
  }

  return baseDocument(
    [
      {
        id: "guide-fuse-battery",
        label: "Battery 1",
        type: "battery",
        x: 240,
        y: 320,
        rotation: 90,
        properties: { voltage: 9 },
      },
      {
        id: "guide-fuse",
        label: "Fuse 1",
        type: "fuse",
        x: 520,
        y: 224,
        rotation: 0,
        properties: { rating: 1.5, blown: false },
      },
      {
        id: "guide-fuse-resistor",
        label: "Resistor 1",
        type: "resistor",
        x: 800,
        y: 224,
        rotation: 0,
        properties: { resistance: 1 },
      },
    ],
    [
      {
        id: "guide-fuse-wire-1",
        from: { componentId: "guide-fuse-battery", terminal: "a" },
        to: { componentId: "guide-fuse", terminal: "a" },
      },
      {
        id: "guide-fuse-wire-2",
        from: { componentId: "guide-fuse", terminal: "b" },
        to: { componentId: "guide-fuse-resistor", terminal: "a" },
      },
      {
        id: "guide-fuse-wire-3",
        from: { componentId: "guide-fuse-resistor", terminal: "b" },
        to: { componentId: "guide-fuse-battery", terminal: "b" },
      },
    ],
  );
}

function componentsByType(document: CircuitDocument, type: CircuitComponentInstance["type"]) {
  return document.components.filter((component) => component.type === type);
}

function hasUnconnectedTerminal(solveResult: CircuitSolveResult, componentId: string) {
  return solveResult.issues.some(
    (issue) =>
      issue.componentId === componentId && issue.code === "unconnected-terminal",
  );
}

function firstPoweredLoad(
  document: CircuitDocument,
  solveResult: CircuitSolveResult,
  type: CircuitComponentInstance["type"],
) {
  return componentsByType(document, type)
    .map((component) => solveResult.componentResults[component.id] ?? null)
    .find(
      (result) =>
        result &&
        result.sourceConnected &&
        result.currentMagnitude !== null &&
        result.currentMagnitude > 0.001,
    ) ?? null;
}

function success(
  locale: CircuitChallengeLocale,
  hint: string,
  explanation: string,
  measurements: CircuitBuilderChallengeCheck["measurements"] = [],
): CircuitBuilderChallengeCheck {
  return {
    status: "success",
    title: t(locale, "Goal met", "已完成目標"),
    hint,
    explanation,
    measurements,
  };
}

function incomplete(
  locale: CircuitChallengeLocale,
  title: string,
  hint: string,
  explanation: string,
): CircuitBuilderChallengeCheck {
  return { status: "incomplete", title, hint, explanation, measurements: [] };
}

function wrongPlacement(
  locale: CircuitChallengeLocale,
  hint: string,
  explanation: string,
): CircuitBuilderChallengeCheck {
  return {
    status: "wrong-placement",
    title: t(locale, "Check the placement", "檢查擺放方式"),
    hint,
    explanation,
    measurements: [],
  };
}

export function evaluateCircuitBuilderChallenge({
  id,
  document,
  solveResult,
  locale = "en",
}: {
  id: CircuitBuilderChallengeId;
  document: CircuitDocument;
  solveResult: CircuitSolveResult;
  locale?: CircuitChallengeLocale;
}): CircuitBuilderChallengeCheck {
  const batteries = componentsByType(document, "battery");
  const resistors = componentsByType(document, "resistor");
  const battery = batteries[0] ?? null;
  const resistor = resistors[0] ?? null;
  const resistorResult = resistor ? solveResult.componentResults[resistor.id] : null;

  if (id === "battery-resistor-loop") {
    if (!battery || !resistor) {
      return incomplete(
        locale,
        t(locale, "Add the two required parts", "加入兩個所需元件"),
        t(
          locale,
          "Add one battery and one resistor, then use two wires to close the path back to the battery.",
          "加入一個電池和一個電阻，然後用兩條導線接回電池形成閉合路徑。",
        ),
        t(
          locale,
          "A circuit can only drive current when there is a source, a load, and a closed return path.",
          "電路需要電源、負載和閉合回路，才會有電流。",
        ),
      );
    }

    if (
      hasUnconnectedTerminal(solveResult, battery.id) ||
      hasUnconnectedTerminal(solveResult, resistor.id) ||
      !resistorResult?.sourceConnected ||
      !resistorResult.currentMagnitude
    ) {
      return incomplete(
        locale,
        t(locale, "The loop is still open", "迴路仍未閉合"),
        t(
          locale,
          "Wire battery positive to one resistor terminal, then wire the other resistor terminal back to battery negative.",
          "把電池正極接到電阻一端，再把電阻另一端接回電池負極。",
        ),
        t(
          locale,
          "The solver is not seeing one continuous path through the resistor yet.",
          "求解器暫時未看到電流能連續流經電阻的路徑。",
        ),
      );
    }

    return success(
      locale,
      t(
        locale,
        "Current has one closed route through the resistor. Select the resistor to inspect the voltage drop.",
        "電流已有一條閉合路徑流經電阻。選取電阻可查看電壓降。",
      ),
      t(
        locale,
        "The battery raises electric potential, the resistor drops it, and the return wire completes the loop.",
        "電池提高電位，電阻造成電位下降，回路導線使路徑閉合。",
      ),
      [
        {
          label: t(locale, "Resistor current", "電阻電流"),
          value: formatMeasurement(resistorResult.currentMagnitude, "A"),
        },
        {
          label: t(locale, "Resistor voltage drop", "電阻電壓降"),
          value: formatMeasurement(resistorResult.voltageMagnitude ?? 0, "V"),
        },
      ],
    );
  }

  if (id === "ammeter-in-series") {
    const ammeter = componentsByType(document, "ammeter")[0] ?? null;
    const ammeterResult = ammeter ? solveResult.componentResults[ammeter.id] : null;

    if (!ammeter) {
      return incomplete(
        locale,
        t(locale, "Add an ammeter", "加入電流錶"),
        t(
          locale,
          "Add an ammeter and break the loop so the current has to pass through the meter.",
          "加入電流錶並打開迴路一處，讓電流必須流經電流錶。",
        ),
        t(
          locale,
          "An ammeter measures branch current only when it is part of the same path as the load.",
          "電流錶只有在與負載同一路徑中，才是在量度該分支電流。",
        ),
      );
    }

    if (
      hasUnconnectedTerminal(solveResult, ammeter.id) ||
      !ammeterResult?.sourceConnected
    ) {
      return incomplete(
        locale,
        t(locale, "The ammeter is not in the live path", "電流錶未在有效路徑中"),
        t(
          locale,
          "Connect both ammeter terminals into the loop; a loose meter cannot report branch current.",
          "把電流錶兩端都接入迴路；未接好的錶不能量度分支電流。",
        ),
        t(locale, "The meter is still floating or only partly wired.", "電流錶仍然浮接或只接了一端。"),
      );
    }

    if (
      (ammeterResult.voltageMagnitude ?? 0) > 1 ||
      (ammeterResult.currentMagnitude ?? 0) > 20 ||
      solveResult.issues.some((issue) => issue.code === "short-source")
    ) {
      return wrongPlacement(
        locale,
        t(
          locale,
          "Move the ammeter into series with the load. Do not place it directly across the battery or across a component.",
          "把電流錶移到與負載串聯的位置。不要把它直接跨接在電池或元件兩端。",
        ),
        t(
          locale,
          "A nearly-zero-resistance ammeter in parallel behaves like a short path, so the reading is not a safe branch-current measurement.",
          "近乎零電阻的電流錶若並聯，會像短路路徑，因此讀數不是安全的分支電流量度。",
        ),
      );
    }

    if ((ammeterResult.currentMagnitude ?? 0) > 0.001) {
      return success(
        locale,
        t(
          locale,
          "The ammeter is in series. Its current should match nearby series loads.",
          "電流錶已串聯；它的電流應與附近串聯負載相同。",
        ),
        t(
          locale,
          "Because every charge in this path must pass through the meter, the ammeter reports the same series current as the load.",
          "因為此路徑中的每份電荷都必須流經電流錶，所以它顯示與負載相同的串聯電流。",
        ),
        [
          {
            label: t(locale, "Ammeter current", "電流錶電流"),
            value: formatMeasurement(ammeterResult.currentMagnitude ?? 0, "A"),
          },
        ],
      );
    }
  }

  if (id === "branch-current-compare") {
    const ammeterResult = firstPoweredLoad(document, solveResult, "ammeter");
    const lampResult = firstPoweredLoad(document, solveResult, "lightBulb");
    const branchResistorResult = firstPoweredLoad(document, solveResult, "resistor");
    const batteryResult = battery ? solveResult.componentResults[battery.id] : null;

    if (!ammeterResult || !lampResult || !branchResistorResult || !batteryResult) {
      return incomplete(
        locale,
        t(locale, "Build two live branches", "建立兩條有效分支"),
        t(
          locale,
          "Load the branch preset or build two paths from the same battery: one metered resistor branch and one bulb branch.",
          "載入分支預設，或由同一電池建立兩條路徑：一條含電流錶和電阻，另一條含燈泡。",
        ),
        t(
          locale,
          "This check needs more than one powered path so the source current can split.",
          "此檢查需要多於一條供電路徑，才能看到電源電流分流。",
        ),
      );
    }

    if ((batteryResult.currentMagnitude ?? 0) <= (ammeterResult.currentMagnitude ?? 0) * 1.05) {
      return incomplete(
        locale,
        t(locale, "The branch split is not visible yet", "仍未看到明顯分流"),
        t(
          locale,
          "Make sure the bulb branch returns to the battery separately from the metered resistor branch.",
          "確保燈泡分支與量度電阻分支分開接回電池。",
        ),
        t(
          locale,
          "If all loads sit in one path, the same current flows everywhere instead of splitting.",
          "如果所有負載都在同一路徑，電流會處處相同，而不是分流。",
        ),
      );
    }

    return success(
      locale,
      t(
        locale,
        "The source current is larger than one branch reading because the battery supplies both paths.",
        "電源電流大於單一分支讀數，因為電池同時供應兩條路徑。",
      ),
      t(
        locale,
        "In a series path current is shared. At a branch node, current divides; the battery current is approximately the sum of the branch currents.",
        "在串聯路徑中電流相同；到達分支節點時電流分開，電池電流約等於各分支電流總和。",
      ),
      [
        {
          label: t(locale, "Source current", "電源電流"),
          value: formatMeasurement(batteryResult.currentMagnitude ?? 0, "A"),
        },
        {
          label: t(locale, "Metered branch", "量度分支"),
          value: formatMeasurement(ammeterResult.currentMagnitude ?? 0, "A"),
        },
        {
          label: t(locale, "Bulb branch", "燈泡分支"),
          value: formatMeasurement(lampResult.currentMagnitude ?? 0, "A"),
        },
      ],
    );
  }

  if (id === "fuse-trip-test") {
    const fuse = componentsByType(document, "fuse")[0] ?? null;
    const fuseResult = fuse ? solveResult.componentResults[fuse.id] : null;

    if (!fuse) {
      return incomplete(
        locale,
        t(locale, "Add a fuse", "加入保險絲"),
        t(locale, "Put a fuse in series with a battery and load.", "把保險絲與電池和負載串聯。"),
        t(locale, "A fuse can only protect a path that actually passes through it.", "保險絲只能保護實際流經它的路徑。"),
      );
    }

    if (fuse.properties.blown || solveResult.autoBlownFuseIds.includes(fuse.id)) {
      return success(
        locale,
        t(
          locale,
          "The fuse opened because the solved current exceeded its rating. Reset it after reducing the current.",
          "求解電流超過額定值，保險絲已斷開。降低電流後再重設。",
        ),
        t(
          locale,
          "The fuse is a sacrificial series element: too much current heats it past its rating, so it opens the circuit and stops the path.",
          "保險絲是犧牲式串聯元件：過大電流使它超過額定值，於是斷開電路並停止該路徑。",
        ),
        [
          {
            label: t(locale, "Fuse rating", "保險絲額定值"),
            value: formatMeasurement(Number(fuse.properties.rating ?? 1.5), "A"),
          },
        ],
      );
    }

    if (!fuseResult?.sourceConnected || !fuseResult.currentMagnitude) {
      return incomplete(
        locale,
        t(locale, "The fuse is not carrying current", "保險絲未承載電流"),
        t(locale, "Wire the fuse into the same closed path as the source and load.", "把保險絲接入與電源和負載相同的閉合路徑。"),
        t(locale, "A fuse cannot trip while it is floating or outside the powered branch.", "保險絲若浮接或不在供電分支中，就不會熔斷。"),
      );
    }

    return incomplete(
      locale,
      t(locale, "Current is below the fuse rating", "電流低於保險絲額定值"),
      t(locale, "Lower the load resistance or the fuse rating until the current exceeds the rating.", "降低負載電阻或保險絲額定值，直至電流超過額定值。"),
      t(locale, "The fuse stays intact because the live current is still within its safe limit.", "保險絲仍完好，因為目前電流仍在安全上限內。"),
    );
  }

  const bulb = componentsByType(document, "lightBulb")[0] ?? null;
  const bulbResult = bulb ? solveResult.componentResults[bulb.id] : null;
  if (!bulb) {
    return incomplete(
      locale,
      t(locale, "Add a bulb", "加入燈泡"),
      t(locale, "Add a light bulb to a powered loop, then check its power readout.", "把燈泡加入供電迴路，再檢查它的功率讀數。"),
      t(locale, "Brightness is tied to electrical power, not just whether wires exist.", "亮度取決於電功率，不只是有沒有導線。"),
    );
  }

  if (!bulbResult?.sourceConnected || !bulbResult.power || bulbResult.power <= 0) {
    return incomplete(
      locale,
      t(locale, "The bulb is not powered yet", "燈泡尚未供電"),
      t(locale, "Close a loop through the bulb so it has current and a voltage drop.", "閉合一條流經燈泡的迴路，讓它有電流和電壓降。"),
      t(locale, "Without current through the bulb, its power is zero and the glow should stay off.", "沒有電流流經燈泡時，功率為零，燈泡不會發光。"),
    );
  }

  const ratedPower = Number(bulb.properties.ratedPower ?? 3);
  const brightnessRatio = ratedPower > 0 ? bulbResult.power / ratedPower : 0;
  return success(
    locale,
    t(
      locale,
      "The bulb is powered. Compare actual power with rated power to explain the glow.",
      "燈泡已有供電。比較實際功率和額定功率即可解釋亮度。",
    ),
    t(
      locale,
      `This bulb is using about ${Math.round(brightnessRatio * 100)}% of its rated power, so the visual glow should ${brightnessRatio >= 1 ? "look bright" : "look dimmer than full rating"}.`,
      `此燈泡約使用額定功率的 ${Math.round(brightnessRatio * 100)}%，所以視覺亮度應${brightnessRatio >= 1 ? "偏亮" : "比滿額定值暗"}。`,
    ),
    [
      {
        label: t(locale, "Bulb power", "燈泡功率"),
        value: formatMeasurement(bulbResult.power, "W"),
      },
      {
        label: t(locale, "Rated power", "額定功率"),
        value: formatMeasurement(ratedPower, "W"),
      },
    ],
  );
}

export function cloneCircuitBuilderChallengeDocument(document: CircuitDocument) {
  return cloneDocument(document);
}
