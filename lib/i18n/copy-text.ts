import type { AppLocale } from "@/i18n/routing";

export function copyText(locale: AppLocale | undefined, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

const simulationCopy = {
  "compare.live": ["Live", "即時"],
  "compare.liveSetup": ["Live setup", "即時設定"],
  "compare.liveState": ["Live state", "即時狀態"],
  "compare.liveSearch": ["Live search", "即時搜尋"],
  "compare.setupA": ["Setup A", "設定 A"],
  "compare.setupB": ["Setup B", "設定 B"],
  "compare.baseline": ["Baseline", "基準版本"],
  "compare.variant": ["Variant", "變化版本"],
  "compare.editing": ["editing", "編輯中"],
  "compare.locked": ["locked", "鎖定"],
  "compare.reference": ["reference", "參考"],

  "simulation.lineState": ["Line state", "直線狀態"],
  "simulation.rotationalState": ["Rotational state", "轉動狀態"],
  "simulation.resonanceState": ["Resonance state", "共鳴狀態"],
  "simulation.bufferBench": ["buffer bench", "緩衝實驗台"],
  "simulation.bufferReadout": ["buffer readout", "緩衝讀數"],
  "simulation.solutionBench": ["Solution bench", "溶液實驗台"],
  "simulation.solutionReadout": ["Solution readout", "溶液讀數"],
  "simulation.linearContrast": ["Linear contrast", "線性對照"],
  "simulation.binarySearchReadout": ["Binary-search readout", "二分搜尋讀數"],
  "simulation.matterWaveState": ["Matter-wave state", "物質波狀態"],
  "simulation.localRate": ["Local rate", "局部變化率"],
  "simulation.patternState": ["Pattern state", "圖樣狀態"],
  "simulation.prismState": ["Prism state", "稜鏡狀態"],
  "simulation.beatState": ["Beat state", "拍頻狀態"],
  "simulation.dopplerState": ["Doppler state", "都卜勒狀態"],
  "simulation.alignmentReadout": ["Alignment readout", "對齊讀數"],
  "simulation.opticsState": ["Optics state", "光學狀態"],
  "simulation.reversibleBench": ["Reversible bench", "可逆實驗台"],
  "simulation.liveReadout": ["Live readout", "即時讀數"],
  "simulation.fieldState": ["Field state", "場狀態"],
  "simulation.currentTransform": ["Current transform", "電流變換"],
  "simulation.inverseReadout": ["Inverse readout", "反向讀數"],
  "simulation.launchState": ["Launch state", "發射狀態"],
  "simulation.probeState": ["Probe state", "探測狀態"],
  "simulation.runningTotal": ["Running total", "累積總量"],
  "simulation.parametricReadout": ["Parametric readout", "參數讀數"],
  "simulation.mirrorState": ["Mirror state", "鏡面狀態"],
  "simulation.constrainedArea": ["Constrained area", "受限面積"],
  "simulation.asymptotesAndIntercepts": ["Asymptotes and intercepts", "漸近線與截距"],
  "simulation.decayState": ["Decay state", "衰變狀態"],
  "simulation.emissionState": ["Emission state", "發射狀態"],
  "simulation.approachReadout": ["Approach readout", "逼近讀數"],
  "simulation.sortingReadout": ["Sorting readout", "排序讀數"],
  "simulation.waveState": ["Wave state", "波動狀態"],
  "simulation.vectorReadout": ["Vector readout", "向量讀數"],
  "simulation.balanceState": ["Balance state", "平衡狀態"],
  "simulation.projectionReadout": ["Projection readout", "投影讀數"],
  "simulation.compareSummary": ["Compare summary", "比較摘要"],
  "simulation.synthesisReading": ["Synthesis reading", "綜合解讀"],
  "simulation.graph": ["Graph", "圖表"],
  "simulation.currentFamily": ["Current family", "目前函數族"],
  "simulation.fluidBench": ["Fluid bench", "流體實驗台"],
  "simulation.steadyStreamTube": ["Steady stream tube", "穩定流管"],
  "simulation.magnetPass": ["Magnet pass", "磁鐵掠過"],
  "simulation.principalAxis": ["principal axis", "主軸"],
  "simulation.lightState": ["Light state", "光線狀態"],
  "simulation.chargeMakesElectricFlux": ["Charge makes electric flux", "電荷產生電通量"],

  "scene.activeCircuit": ["Active circuit", "工作中電路"],
  "scene.energyBalance": ["Energy balance", "能量平衡"],
  "scene.modeShape": ["Mode shape", "模態形狀"],
  "scene.drivenResponse": ["Driven response", "受迫響應"],
  "scene.transientMode": ["Transient mode", "暫態模式"],
  "scene.fixedBarLength": ["Fixed bar length", "固定棒長度"],
  "scene.resistiveLoad": ["Resistive load", "電阻負載"],
  "scene.graphScanLine": ["graph scan line", "圖表掃描線"],
  "scene.liveArray": ["Live array", "即時陣列"],

  "readout.result": ["Result", "結果"],
  "readout.theta": ["theta", "θ"],
  "readout.eeff": ["Eeff", "有效能量"],
} as const satisfies Record<string, readonly [english: string, zhHongKong: string]>;

export type SimulationCopyKey = keyof typeof simulationCopy;

export function getSimulationCopy(locale: AppLocale | undefined, key: SimulationCopyKey) {
  const [english, zhHongKong] = simulationCopy[key];
  return copyText(locale, english, zhHongKong);
}

export function getCompareSetupLabel(locale: AppLocale | undefined, setup: "a" | "b") {
  return getSimulationCopy(locale, setup === "a" ? "compare.setupA" : "compare.setupB");
}

export function getCompareBadgeLabel(locale: AppLocale | undefined, badge: "editing" | "locked") {
  return getSimulationCopy(locale, badge === "editing" ? "compare.editing" : "compare.locked");
}

export function getVariantLabel(
  locale: AppLocale | undefined,
  variant: "live" | "baseline" | "variant",
) {
  switch (variant) {
    case "baseline":
      return getSimulationCopy(locale, "compare.baseline");
    case "variant":
      return getSimulationCopy(locale, "compare.variant");
    default:
      return getSimulationCopy(locale, "compare.live");
  }
}
