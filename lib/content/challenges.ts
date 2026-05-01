import type {
  ConceptChallengeCheck,
  ConceptChallengeItem,
  ConceptChallengeItemAuthoring,
  ConceptChallengeMode,
  ConceptChallengeModeAuthoring,
  ConceptChallengeRequirementsAuthoring,
  ConceptChallengeSetup,
  ConceptChallengeTargetAuthoring,
  ConceptGraph,
  ConceptVariableLink,
} from "./schema";

export type ChallengeDepth = "warm-up" | "core" | "stretch";

type ChallengeGraphLike = Pick<ConceptGraph, "id" | "label">;
type ChallengeOverlayLike = {
  id: string;
  label: string;
};
type ChallengeControlLike = {
  id?: string;
  param?: string;
  label: string;
};
type ChallengeLabelLocale = "en" | "zh-HK";

type ChallengeNormalizationContext = {
  graphs: ChallengeGraphLike[];
  overlays?: ChallengeOverlayLike[];
  controls?: ChallengeControlLike[];
  variableLinks?: Pick<ConceptVariableLink, "id" | "label">[];
  locale?: ChallengeLabelLocale;
};

export type ChallengeItemSignals = {
  graphIds: string[];
  overlayIds: string[];
  targetMetrics: string[];
  targetParams: string[];
  usesCompare: boolean;
  compareTargets: Array<"a" | "b">;
  usesInspect: boolean;
};

export type ChallengeCatalogEntry = Pick<
  ConceptChallengeItem,
  "id" | "title" | "style" | "prompt" | "successMessage"
> &
  ChallengeItemSignals & {
    depth: ChallengeDepth;
    checkCount: number;
    hasSetup: boolean;
    hintCount: number;
    cueLabels: string[];
    requirementLabels: string[];
    targetLabels: string[];
    highlightVariableIds: string[];
  };

function buildLabelMap<T extends { id: string; label: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item.label]));
}

function formatChallengeNumber(value: number) {
  const absValue = Math.abs(value);
  const digits =
    absValue >= 100 ? 0 : absValue >= 10 ? 1 : absValue >= 1 ? 2 : absValue >= 0.1 ? 3 : 4;

  return Number.parseFloat(value.toFixed(digits)).toString();
}

function formatChallengeBound(value: number, unit?: string) {
  const formatted = formatChallengeNumber(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatChallengeRange(
  min: number | undefined,
  max: number | undefined,
  unit?: string,
  locale: ChallengeLabelLocale = "en",
) {
  if (locale === "zh-HK") {
    if (min !== undefined && max !== undefined) {
      return `${formatChallengeBound(min, unit)} 至 ${formatChallengeBound(max, unit)}`;
    }

    if (min !== undefined) {
      return `至少 ${formatChallengeBound(min, unit)}`;
    }

    return `最多 ${formatChallengeBound(max ?? 0, unit)}`;
  }

  if (min !== undefined && max !== undefined) {
    return `between ${formatChallengeBound(min, unit)} and ${formatChallengeBound(max, unit)}`;
  }

  if (min !== undefined) {
    return `at least ${formatChallengeBound(min, unit)}`;
  }

  return `at most ${formatChallengeBound(max ?? 0, unit)}`;
}

function humanizeChallengeField(value: string) {
  const knownLabels: Record<string, string> = {
    vx: "horizontal velocity",
    vy: "vertical velocity",
    x: "horizontal position",
    y: "vertical position",
    omega: "angular frequency",
    componentDifference: "component mismatch",
    normalizedIntensity: "relative intensity",
    resultantAmplitude: "resultant amplitude",
    resultantDisplacement: "instantaneous resultant displacement",
    centripetalAcceleration: "centripetal acceleration",
  };

  if (knownLabels[value]) {
    return knownLabels[value];
  }

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .toLowerCase();
}

function normalizeChallengeFieldKey(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

const zhHkChallengeFieldLabels: Record<string, string> = {
  actualfraction: "實際剩餘比例",
  actualremainingcount: "實際剩餘數目",
  actualspeed: "實際速度",
  accumulatedvalue: "累積值",
  acidamount: "酸量",
  acidshare: "酸比例",
  angularacceleration: "角加速度",
  angularmomentum: "角動量",
  angularspeed: "角速度",
  arraysize: "陣列大小",
  baseamount: "鹼量",
  baseshare: "鹼比例",
  branchbcurrent: "B 支路電流",
  branchbvoltage: "B 支路電壓",
  bufferamount: "緩衝劑量",
  bufferremaining: "剩餘緩衝儲備",
  capacity: "容量",
  centerdipratio: "中心下陷比例",
  centerofmassx: "質心 x 位置",
  centripetalacceleration: "向心加速度",
  chargeforcemagnitude: "試驗電荷受力大小",
  chargeforcex: "試驗電荷受力 x 分量",
  chargeforcey: "試驗電荷受力 y 分量",
  collisionattempts: "碰撞嘗試次數",
  collectorcurrent: "集電電流",
  comparisons: "比較次數",
  completed: "完成狀態",
  concentration: "濃度",
  conductionrate: "傳導速率",
  convectionrate: "對流速率",
  criticaloffset: "臨界偏移量",
  current: "電流",
  deviationcount: "偏差數目",
  edgelength: "邊長",
  edgepathdifferenceinwavelengths: "邊緣路徑差（波長數）",
  elapsedhalflives: "經過的半衰期數",
  emf: "感應電動勢",
  energygap: "能隙",
  equivalentresistance: "等效電阻",
  excessamount: "過剩固體量",
  excitationflag: "激發模式",
  expectedfraction: "預期剩餘比例",
  expectedremainingcount: "預期剩餘數目",
  fieldmagnitude: "電場大小",
  fieldx: "電場 x 分量",
  fieldy: "電場 y 分量",
  firstminimumangledeg: "第一極小角度",
  fitcount: "可容納整數組數",
  fluxchangerate: "磁通變化率",
  fluxlinkage: "磁通連結",
  forcemagnitude: "受力大小",
  forcex: "受力 x 分量",
  forcey: "受力 y 分量",
  found: "是否找到目標",
  frequencyphz: "頻率",
  fringespacing: "條紋間距",
  gravityacceleration: "重力加速度",
  groupequivalentresistance: "群組等效電阻",
  imagedistance: "像距",
  intensitycue: "強度提示",
  internalenergy: "內能",
  launchspeed: "發射速度",
  longestvisiblewavelengthnm: "最長可見波長",
  magnification: "放大率",
  maxheight: "最高點",
  maxkineticenergyev: "最大動能",
  minvisibleseparationnm: "最小可分辨間距",
  modeflag: "模式狀態",
  netforce: "淨力",
  normalizedintensity: "相對強度",
  normalizedprobecompression: "探針正規化壓縮程度",
  observedfrequency: "觀測頻率",
  period: "週期",
  phasefraction: "相分率",
  phaselagcycles: "相位延遲週期數",
  ph: "pH",
  photonenergyev: "光子能量",
  positionx: "x 位置",
  potential: "電勢",
  potentialenergy: "位能",
  power: "功率",
  pressure: "壓力",
  probecompression: "探針壓縮程度",
  probeenvelope: "探針包絡",
  probepressureenvelope: "探針壓力包絡",
  probedisplacement: "探針位移",
  productfavor: "產物偏向程度",
  productimaginary: "乘積虛部",
  productreal: "乘積實部",
  productshare: "產物比例",
  radiationrate: "輻射速率",
  radius: "半徑",
  range: "射程",
  rategap: "速率差",
  requiredcentripetalacceleration: "所需向心加速度",
  resulantamplitude: "合成振幅",
  resultmagnitude: "結果向量大小",
  resultantamplitude: "合成振幅",
  resultantdisplacement: "即時合位移",
  rotationangle: "旋轉角度",
  scalefactor: "縮放因子",
  scaledmagnitude: "縮放後大小",
  secantslope: "割線斜率",
  separationratio: "分離比例",
  shortestvisiblewavelengthnm: "最短可見波長",
  soluteamount: "溶質量",
  solventvolume: "溶劑體積",
  sourceheight: "源項高度",
  speed: "速度",
  speedfactor: "速度倍率",
  speedratio: "速度比",
  spreadangle: "擴散角度",
  stabilitymargin: "穩定裕度",
  successfraction: "成功比例",
  successfulcollisionrate: "成功碰撞速率",
  surfacepressure: "表面壓力",
  tangentslope: "切線斜率",
  targetindex: "目標索引",
  temperature: "溫度",
  temperaturechange: "溫度變化",
  temperaturecontrast: "溫差",
  temperaturerate: "升溫速率",
  terminalgap: "與終端速度的差距",
  terminalspeed: "終端速度",
  throatpressure: "喉部壓力",
  throatspeed: "喉部速度",
  torque: "扭矩",
  torqueaboutsupportcenter: "相對支撐中心的扭矩",
  totalcurrent: "總電流",
  totalenergy: "總能量",
  totalpressure: "總壓力",
  totalrate: "總速率",
  transmittedintensityfraction: "透射強度比例",
  traveltime: "傳播時間",
  turnaroundradius: "折返半徑",
  unpolarizedflag: "未偏振狀態",
  upperbound: "上界",
  vertexx: "頂點 x 座標",
  vertexy: "頂點 y 座標",
  verticalscale: "垂直縮放",
  visiblelinecount: "可見譜線數目",
  vy: "垂直速度",
  watervolume: "水量",
  wavelengthnm: "波長",
  wireforcemagnitude: "導線受力大小",
  wireforcex: "導線受力 x 分量",
  wireforcey: "導線受力 y 分量",
  writecount: "寫入次數",
  x: "x 位置",
  xpos: "x 位置",
  xposition: "x 位置",
  y: "y 位置",
};

const zhHkChallengeWordLabels: Record<string, string> = {
  acceleration: "加速度",
  actual: "實際",
  acid: "酸",
  active: "目前",
  amount: "數量",
  amplitude: "振幅",
  angle: "角度",
  angular: "角",
  array: "陣列",
  base: "鹼",
  branch: "支路",
  buffer: "緩衝",
  capacity: "容量",
  cargo: "貨物",
  catalyst: "催化劑",
  center: "中心",
  charge: "電荷",
  collision: "碰撞",
  collisions: "碰撞",
  compare: "比較",
  component: "分量",
  concentration: "濃度",
  conduction: "傳導",
  convection: "對流",
  current: "電流",
  deviation: "偏差",
  difference: "差",
  displacement: "位移",
  distance: "距離",
  edge: "邊緣",
  elapsed: "已過",
  emf: "感應電動勢",
  energy: "能量",
  equivalent: "等效",
  excess: "過剩",
  excitation: "激發",
  expected: "預期",
  field: "電場",
  fit: "配合",
  flux: "磁通",
  force: "受力",
  fraction: "比例",
  frequency: "頻率",
  graph: "圖表",
  gravity: "重力",
  half: "半",
  harmonic: "諧波",
  height: "高度",
  horizontal: "水平",
  image: "像",
  imaginary: "虛部",
  impulse: "衝量",
  index: "索引",
  intensity: "強度",
  internal: "內部",
  lag: "延遲",
  launch: "發射",
  level: "能級",
  line: "譜線",
  magnitude: "大小",
  margin: "裕度",
  mass: "質量",
  max: "最大",
  metric: "量",
  middle: "中間",
  min: "最小",
  mode: "模式",
  momentum: "動量",
  net: "淨",
  normalized: "正規化",
  observed: "觀測",
  operand: "乘數",
  order: "階數",
  path: "路徑",
  percent: "百分比",
  phase: "相位",
  ph: "pH",
  photon: "光子",
  pile: "堆積",
  point: "點",
  position: "位置",
  potential: "勢",
  power: "功率",
  pressure: "壓力",
  probe: "探針",
  product: "乘積",
  projection: "投影",
  radius: "半徑",
  rate: "速率",
  real: "實部",
  recipe: "配方",
  refracted: "折射",
  remaining: "剩餘",
  resonance: "共振",
  resistance: "電阻",
  resultant: "合成",
  rotation: "旋轉",
  scale: "縮放",
  screen: "屏幕",
  separation: "分離",
  share: "比例",
  shelf: "平台",
  size: "大小",
  slope: "斜率",
  solute: "溶質",
  solvent: "溶劑",
  source: "來源",
  speed: "速度",
  spread: "擴散",
  success: "成功",
  successful: "成功",
  support: "支撐",
  target: "目標",
  temperature: "溫度",
  terminal: "終端",
  test: "試驗",
  throat: "喉部",
  time: "時間",
  torque: "扭矩",
  total: "總",
  transmitted: "透射",
  turn: "轉",
  turnaround: "折返",
  unpolarized: "未偏振",
  upper: "上層",
  vertical: "垂直",
  visible: "可見",
  voltage: "電壓",
  volume: "體積",
  water: "水量",
  wave: "波",
  wavelength: "波長",
  width: "寬度",
  wire: "導線",
  write: "寫入",
  x: "x",
  y: "y",
};

function buildChallengeFieldLabelLookup(
  items: Array<{ id?: string; param?: string; label: string }> | undefined,
) {
  const labels = new Map<string, string>();

  for (const item of items ?? []) {
    const keys = [item.id, item.param]
      .filter((value): value is string => Boolean(value))
      .map((value) => normalizeChallengeFieldKey(value));

    for (const key of keys) {
      labels.set(key, item.label);
    }
  }

  return labels;
}

function localizeChallengeFieldLabel(value: string, locale: ChallengeLabelLocale) {
  const normalizedValue = normalizeChallengeFieldKey(value);

  if (locale !== "zh-HK") {
    return humanizeChallengeField(value);
  }

  const exactMatch = zhHkChallengeFieldLabels[normalizedValue];
  if (exactMatch) {
    return exactMatch;
  }

  const englishWords = humanizeChallengeField(value).split(/\s+/).filter(Boolean);
  if (!englishWords.length) {
    return value;
  }

  return englishWords
    .map((word) => zhHkChallengeWordLabels[word] ?? word)
    .join("");
}

function resolveChallengeFieldLabel(
  value: string,
  context: ChallengeNormalizationContext,
) {
  const locale = context.locale ?? "en";
  const normalizedValue = normalizeChallengeFieldKey(value);

  if (locale === "zh-HK") {
    const controlLabels = buildChallengeFieldLabelLookup(context.controls);
    const variableLabels = buildChallengeFieldLabelLookup(context.variableLinks);
    return (
      controlLabels.get(normalizedValue) ??
      variableLabels.get(normalizedValue) ??
      localizeChallengeFieldLabel(value, locale)
    );
  }

  return humanizeChallengeField(value);
}

function buildGraphRequirementLabel(
  graphId: string,
  labelsById: Map<string, string>,
  locale: ChallengeLabelLocale = "en",
) {
  const graphLabel = labelsById.get(graphId) ?? humanizeChallengeField(graphId);
  return locale === "zh-HK" ? `打開「${graphLabel}」圖表。` : `Open the ${graphLabel} graph.`;
}

function buildOverlayRequirementLabel(
  overlayId: string,
  labelsById: Map<string, string>,
  locale: ChallengeLabelLocale = "en",
) {
  const overlayLabel = labelsById.get(overlayId) ?? humanizeChallengeField(overlayId);
  return locale === "zh-HK"
    ? `保持顯示「${overlayLabel}」。`
    : `Keep the ${overlayLabel} visible.`;
}

function buildTimeSourceRequirementLabel(
  source: NonNullable<ConceptChallengeRequirementsAuthoring["timeSource"]>,
  locale: ChallengeLabelLocale = "en",
) {
  if (locale === "zh-HK") {
    switch (source) {
      case "inspect":
        return "切換到檢視時間模式。";
      case "preview":
        return "保持在圖表預覽狀態。";
      case "live":
      default:
        return "回到即時時間。";
    }
  }

  switch (source) {
    case "inspect":
      return "Pause into inspect mode.";
    case "preview":
      return "Stay on the graph preview state.";
    case "live":
    default:
      return "Return to live time.";
  }
}

function buildTimeRangeRequirementLabel(
  requirement: NonNullable<ConceptChallengeRequirementsAuthoring["timeRange"]>,
  locale: ChallengeLabelLocale = "en",
) {
  if (requirement.label) {
    return requirement.label;
  }

  return locale === "zh-HK"
    ? `把檢視時間保持在 ${formatChallengeRange(
        requirement.min,
        requirement.max,
        requirement.displayUnit,
        locale,
      )}。`
    : `Keep the inspect time ${formatChallengeRange(
        requirement.min,
        requirement.max,
        requirement.displayUnit,
        locale,
      )}.`;
}

function buildCompareRequirementLabel(
  requirements: Pick<ConceptChallengeRequirementsAuthoring, "compareActive" | "compareTarget">,
  locale: ChallengeLabelLocale = "en",
) {
  if (!requirements.compareActive && !requirements.compareTarget) {
    return null;
  }

  if (requirements.compareTarget) {
    return locale === "zh-HK"
      ? `保持在比較模式，並編輯設定 ${requirements.compareTarget.toUpperCase()}。`
      : `Stay in compare mode while editing Setup ${requirements.compareTarget.toUpperCase()}.`;
  }

  return locale === "zh-HK" ? "保持在比較模式。" : "Stay in compare mode.";
}

function buildTargetLabel(
  target: ConceptChallengeTargetAuthoring,
  context: ChallengeNormalizationContext,
) {
  const locale = context.locale ?? "en";

  if (target.label) {
    return target.label;
  }

  const subject = target.metric
    ? resolveChallengeFieldLabel(target.metric, context)
    : resolveChallengeFieldLabel(target.param ?? "target", context);

  return buildChallengeRangeLabel(
    subject,
    {
      min: target.min,
      max: target.max,
      displayUnit: target.displayUnit,
      setup: target.setup,
    },
    locale,
  );
}

function buildChallengeRangeLabel(
  subject: string,
  range: {
    min: number | undefined;
    max: number | undefined;
    displayUnit?: string;
    setup?: "a" | "b";
  },
  locale: ChallengeLabelLocale,
) {
  if (locale === "zh-HK") {
    const setupPrefix = range.setup ? `設定 ${range.setup.toUpperCase()} 的` : "";
    return `把${setupPrefix}${subject}保持在 ${formatChallengeRange(
      range.min,
      range.max,
      range.displayUnit,
      locale,
    )}。`;
  }

  const setupPrefix = range.setup ? `Setup ${range.setup.toUpperCase()} ` : "";
  return `Keep ${setupPrefix}${subject} ${formatChallengeRange(
    range.min,
    range.max,
    range.displayUnit,
    locale,
  )}.`;
}

function buildRequirementChecks(
  requirements: ConceptChallengeRequirementsAuthoring | undefined,
  context: ChallengeNormalizationContext,
): ConceptChallengeCheck[] {
  if (!requirements) {
    return [];
  }

  const graphLabels = buildLabelMap(context.graphs);
  const overlayLabels = buildLabelMap(context.overlays ?? []);
  const checks: ConceptChallengeCheck[] = [];

  if (requirements.graphId) {
    checks.push({
      type: "graph-active",
      label: buildGraphRequirementLabel(requirements.graphId, graphLabels, context.locale),
      graphId: requirements.graphId,
    });
  }

  for (const overlayId of requirements.overlayIds ?? []) {
    checks.push({
      type: "overlay-active",
      label: buildOverlayRequirementLabel(overlayId, overlayLabels, context.locale),
      overlayId,
    });
  }

  if (requirements.timeSource) {
    checks.push({
      type: "time-source",
      label: buildTimeSourceRequirementLabel(requirements.timeSource, context.locale),
      source: requirements.timeSource,
    });
  }

  if (requirements.timeRange) {
    checks.push({
      type: "time-range",
      label: buildTimeRangeRequirementLabel(requirements.timeRange, context.locale),
      min: requirements.timeRange.min,
      max: requirements.timeRange.max,
      displayUnit: requirements.timeRange.displayUnit,
    });
  }

  const compareLabel = buildCompareRequirementLabel(requirements, context.locale);
  if (compareLabel) {
    checks.push({
      type: "compare-active",
      label: compareLabel,
      target: requirements.compareTarget,
    });
  }

  return checks;
}

function buildTargetChecks(
  targets: ConceptChallengeTargetAuthoring[] | undefined,
  context: ChallengeNormalizationContext,
): ConceptChallengeCheck[] {
  if (!targets?.length) {
    return [];
  }

  return targets.map<ConceptChallengeCheck>((target) => {
    const label = buildTargetLabel(target, context);

    if (target.setup && target.metric) {
      return {
        type: "compare-metric-range",
        label,
        setup: target.setup,
        metric: target.metric,
        min: target.min,
        max: target.max,
        displayUnit: target.displayUnit,
      };
    }

    if (target.setup && target.param) {
      return {
        type: "compare-param-range",
        label,
        setup: target.setup,
        param: target.param,
        min: target.min,
        max: target.max,
        displayUnit: target.displayUnit,
      };
    }

    if (target.metric) {
      return {
        type: "metric-range",
        label,
        metric: target.metric,
        min: target.min,
        max: target.max,
        displayUnit: target.displayUnit,
      };
    }

    return {
      type: "param-range",
      label,
      param: target.param ?? "",
      min: target.min,
      max: target.max,
      displayUnit: target.displayUnit,
    };
  });
}

export function localizeChallengeChecks(
  checks: ConceptChallengeCheck[],
  context: ChallengeNormalizationContext,
): ConceptChallengeCheck[] {
  const locale = context.locale ?? "en";
  const graphLabels = buildLabelMap(context.graphs);
  const overlayLabels = buildLabelMap(context.overlays ?? []);

  return checks.map((check) => {
    switch (check.type) {
      case "graph-active":
        return {
          ...check,
          label: buildGraphRequirementLabel(check.graphId, graphLabels, locale),
        };
      case "overlay-active": {
        const overlayLabel =
          overlayLabels.get(check.overlayId) ?? humanizeChallengeField(check.overlayId);
        return {
          ...check,
          label:
            locale === "zh-HK"
              ? check.value === false
                ? `保持隱藏「${overlayLabel}」。`
                : `保持顯示「${overlayLabel}」。`
              : check.value === false
                ? `Keep the ${overlayLabel} hidden.`
                : `Keep the ${overlayLabel} visible.`,
        };
      }
      case "time-source":
        return {
          ...check,
          label: buildTimeSourceRequirementLabel(check.source, locale),
        };
      case "time-range":
        return {
          ...check,
          label: buildTimeRangeRequirementLabel(
            {
              min: check.min,
              max: check.max,
              displayUnit: check.displayUnit,
            },
            locale,
          ),
        };
      case "compare-active":
        return {
          ...check,
          label:
            buildCompareRequirementLabel(
              {
                compareActive: true,
                compareTarget: check.target,
              },
              locale,
            ) ?? check.label,
        };
      case "param-range":
        return {
          ...check,
          label: buildChallengeRangeLabel(
            resolveChallengeFieldLabel(check.param, context),
            {
              min: check.min,
              max: check.max,
              displayUnit: check.displayUnit,
            },
            locale,
          ),
        };
      case "metric-range":
        return {
          ...check,
          label: buildChallengeRangeLabel(
            resolveChallengeFieldLabel(check.metric, context),
            {
              min: check.min,
              max: check.max,
              displayUnit: check.displayUnit,
            },
            locale,
          ),
        };
      case "compare-param-range":
        return {
          ...check,
          label: buildChallengeRangeLabel(
            resolveChallengeFieldLabel(check.param, context),
            {
              min: check.min,
              max: check.max,
              displayUnit: check.displayUnit,
              setup: check.setup,
            },
            locale,
          ),
        };
      case "compare-metric-range":
        return {
          ...check,
          label: buildChallengeRangeLabel(
            resolveChallengeFieldLabel(check.metric, context),
            {
              min: check.min,
              max: check.max,
              displayUnit: check.displayUnit,
              setup: check.setup,
            },
            locale,
          ),
        };
      default:
        return check;
    }
  });
}

function isRequirementCheck(check: ConceptChallengeCheck) {
  return (
    check.type === "graph-active" ||
    check.type === "overlay-active" ||
    check.type === "time-source" ||
    check.type === "time-range" ||
    check.type === "compare-active"
  );
}

export function getChallengeRequirementLabels(item: ConceptChallengeItem) {
  return item.checks.filter(isRequirementCheck).map((check) => check.label);
}

export function getChallengeTargetLabels(item: ConceptChallengeItem) {
  return item.checks.filter((check) => !isRequirementCheck(check)).map((check) => check.label);
}

function normalizeChallengeSetup(
  item: ConceptChallengeItemAuthoring,
): ConceptChallengeSetup | undefined {
  const requirements = item.requirements;
  const nextSetup = {
    ...item.setup,
    graphId: item.setup?.graphId ?? requirements?.graphId,
    overlayIds: item.setup?.overlayIds ?? requirements?.overlayIds,
    interactionMode:
      item.setup?.interactionMode ??
      (requirements?.compareTarget || requirements?.compareActive ? "compare" : undefined),
  };

  if (
    nextSetup.presetId ||
    Object.keys(nextSetup.patch ?? {}).length ||
    nextSetup.graphId ||
    nextSetup.overlayIds?.length ||
    nextSetup.inspectTime !== undefined ||
    nextSetup.interactionMode
  ) {
    return nextSetup;
  }

  return undefined;
}

function normalizeChallengeItem(
  item: ConceptChallengeItemAuthoring,
  context: ChallengeNormalizationContext,
): ConceptChallengeItem {
  return {
    id: item.id,
    title: item.title,
    style: item.style,
    prompt: item.prompt,
    successMessage: item.successMessage,
    setup: normalizeChallengeSetup(item),
    hints: item.hints,
    checks: [
      ...buildRequirementChecks(item.requirements, context),
      ...buildTargetChecks(item.targets, context),
      ...(item.checks ?? []),
    ],
  };
}

export function normalizeChallengeModeAuthoring(
  mode: ConceptChallengeModeAuthoring | undefined,
  context: ChallengeNormalizationContext,
): ConceptChallengeMode | undefined {
  if (!mode) {
    return undefined;
  }

  return {
    title: mode.title,
    intro: mode.intro,
    items: mode.items.map((item) => normalizeChallengeItem(item, context)),
  };
}

export function getChallengeItemSignals(item: ConceptChallengeItem): ChallengeItemSignals {
  const graphIds = new Set<string>();
  const overlayIds = new Set<string>();
  const targetMetrics = new Set<string>();
  const targetParams = new Set<string>();
  const compareTargets = new Set<"a" | "b">();
  let usesCompare = item.setup?.interactionMode === "compare";
  let usesInspect = false;

  for (const check of item.checks) {
    switch (check.type) {
      case "graph-active":
        graphIds.add(check.graphId);
        break;
      case "overlay-active":
        if (check.value ?? true) {
          overlayIds.add(check.overlayId);
        }
        break;
      case "time-source":
        usesInspect = usesInspect || check.source === "inspect";
        break;
      case "time-range":
        usesInspect = true;
        break;
      case "compare-active":
        usesCompare = true;
        if (check.target) {
          compareTargets.add(check.target);
        }
        break;
      case "compare-param-range":
        usesCompare = true;
        compareTargets.add(check.setup);
        targetParams.add(check.param);
        break;
      case "compare-metric-range":
        usesCompare = true;
        compareTargets.add(check.setup);
        targetMetrics.add(check.metric);
        break;
      case "param-range":
        targetParams.add(check.param);
        break;
      case "metric-range":
        targetMetrics.add(check.metric);
        break;
      default:
        check satisfies never;
    }
  }

  return {
    graphIds: [...graphIds],
    overlayIds: [...overlayIds],
    targetMetrics: [...targetMetrics],
    targetParams: [...targetParams],
    usesCompare,
    compareTargets: [...compareTargets],
    usesInspect,
  };
}

export function getChallengeDepth(item: ConceptChallengeItem): ChallengeDepth {
  const signals = getChallengeItemSignals(item);
  const checkCount = item.checks.length;

  if (
    (signals.usesCompare && signals.usesInspect) ||
    (signals.usesCompare && checkCount >= 4) ||
    (signals.usesInspect && checkCount >= 4)
  ) {
    return "stretch";
  }

  if (signals.usesCompare || signals.usesInspect || checkCount >= 3) {
    return "core";
  }

  return "warm-up";
}

export function getChallengeCueLabels(item: ConceptChallengeItem) {
  const signals = getChallengeItemSignals(item);
  const cueLabels: string[] = [];

  if (signals.usesCompare) {
    cueLabels.push("Compare mode");
  }

  if (signals.usesInspect) {
    cueLabels.push("Inspect time");
  }

  if (signals.graphIds.length) {
    cueLabels.push("Graph-linked");
  }

  if (item.setup) {
    cueLabels.push("Guided start");
  }

  if (item.hints?.length) {
    cueLabels.push(item.hints.length === 1 ? "1 hint" : `${item.hints.length} hints`);
  }

  return cueLabels.slice(0, 4);
}

export function getChallengeCatalogEntries(
  mode: ConceptChallengeMode | undefined,
  variableLinks: ConceptVariableLink[] = [],
): ChallengeCatalogEntry[] {
  if (!mode?.items.length) {
    return [];
  }

  return mode.items.map((item) => {
    const signals = getChallengeItemSignals(item);
    const highlightVariableIds = variableLinks
      .filter(
        (variable) =>
          signals.targetParams.includes(variable.param) ||
          variable.graphIds?.some((graphId) => signals.graphIds.includes(graphId)) ||
          variable.overlayIds?.some((overlayId) => signals.overlayIds.includes(overlayId)),
      )
      .map((variable) => variable.id);

    return {
      id: item.id,
      title: item.title,
      style: item.style,
      prompt: item.prompt,
      successMessage: item.successMessage,
      depth: getChallengeDepth(item),
      checkCount: item.checks.length,
      hasSetup: Boolean(item.setup),
      hintCount: item.hints?.length ?? 0,
      cueLabels: getChallengeCueLabels(item),
      requirementLabels: getChallengeRequirementLabels(item),
      targetLabels: getChallengeTargetLabels(item),
      highlightVariableIds,
      ...signals,
    };
  });
}
